// Test integracyjny: odpad (scrap) zdejmuje partie cenowe FIFO, więc wycena nie
// zawyża wartości złomowanych sztuk, a cofnięcie oddaje partie. Izolowana baza,
// forge req.user (admin). Wymaga lokalnego Mongo. Uruchom: `node --test --test-force-exit`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DB_NAME = 'maturalni_equipment_scrap_test';

const { default: app } = await import('../src/index.js');
const { getDb, closeDb } = await import('../src/db.js');
const { collections } = await import('../src/schema.js');
const { seedStandardLocations, applyMove, nextReference } = await import('../src/stock.js');

function startServer(user) {
  const parent = express();
  parent.use(express.json());
  parent.use((req, _res, next) => { req.user = user; req.isAuthenticated = () => true; next(); });
  parent.use(app);
  return new Promise(resolve => { const s = parent.listen(0, () => resolve(s)); });
}

function req(server, method, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path, method }, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, json: body ? JSON.parse(body) : null }));
    });
    r.on('error', reject);
    r.end();
  });
}

const admin = { email: 'admin@maturalni.com', fullName: 'Admin', role: 'admin' };
let server, db, stockId, scrapId, supplierId, opId;

const valuationFor = (json, code) =>
  (json.categories || []).flatMap(c => c.products).find(p => p.itemCode === code);

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  const byCode = await seedStandardLocations(db);
  stockId = String(byCode.get('WH/Stock')._id);
  scrapId = String(byCode.get('VIRT/Scrap')._id);
  supplierId = String(byCode.get('VIRT/Suppliers')._id);

  // Produkt z dwiema warstwami: 6×10 zł + 4×20 zł = 10 szt., wartość 140 zł.
  await db.collection(collections.items).insertOne({
    itemCode: 'TOWAR-S', name: 'Karton', category: 'towar', quantity: 10, isActive: true,
    priceBatches: [
      { qty: 6, unitPrice: 10, note: 'p1', addedAt: new Date() },
      { qty: 4, unitPrice: 20, note: 'p2', addedAt: new Date() }
    ]
  });
  // Quanty zgodne ze stanem (przyjęcie 10 szt. na Magazyn) — by kontrola dostępności przeszła.
  await applyMove(db, { itemCode: 'TOWAR-S', fromLocationId: supplierId, toLocationId: stockId, quantity: 10, kind: 'receipt' });

  // Operacja odpadu: złomujemy 3 szt. z Magazynu.
  const reference = await nextReference(db, 'mag/SCRAP');
  const now = new Date();
  const { insertedId } = await db.collection(collections.stockOperations).insertOne({
    reference, type: 'scrap', state: 'ready',
    fromLocationId: stockId, toLocationId: scrapId,
    lines: [{ itemCode: 'TOWAR-S', quantity: 3 }],
    createdByEmail: admin.email, createdAt: now, updatedAt: now
  });
  opId = String(insertedId);

  server = await startServer(admin);
});

test.after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.dropDatabase();
  await closeDb();
});

test('zatwierdzenie odpadu zdejmuje partie FIFO i obniża wycenę', async () => {
  const { status } = await req(server, 'POST', `/warehouse/operations/${opId}/validate`);
  assert.equal(status, 200);

  const item = await db.collection(collections.items).findOne({ itemCode: 'TOWAR-S' });
  // FIFO zdjęło 3 z pierwszej warstwy (6→3); zostaje 3×10 + 4×20 = 7 szt.
  const totalQty = item.priceBatches.reduce((s, b) => s + b.qty, 0);
  assert.equal(totalQty, 7);
  assert.equal(item.quantity, 7);

  // Snapshot do cofania zapisany.
  const opDoc = await db.collection(collections.stockOperations).findOne({ type: 'scrap' });
  assert.equal(opDoc.state, 'done');
  assert.ok(Array.isArray(opDoc.scrapDetail) && opDoc.scrapDetail.length === 1);
  assert.equal(opDoc.scrapDetail[0].qty, 3);

  // Wycena: 3×10 + 4×20 = 110 zł (nie 140 — złomowane 3 szt. zniknęły).
  const val = await req(server, 'GET', '/warehouse/valuation');
  assert.equal(valuationFor(val.json, 'TOWAR-S').value, 110);

  // Stan na Magazynie też 7.
  const q = await db.collection(collections.quants).findOne({ itemCode: 'TOWAR-S', locationId: stockId });
  assert.equal(q.quantity, 7);
});

test('cofnięcie odpadu oddaje partie i przywraca wycenę', async () => {
  const { status } = await req(server, 'POST', `/warehouse/operations/${opId}/reverse`);
  assert.equal(status, 200);

  const item = await db.collection(collections.items).findOne({ itemCode: 'TOWAR-S' });
  const totalQty = item.priceBatches.reduce((s, b) => s + b.qty, 0);
  assert.equal(totalQty, 10);
  assert.equal(item.quantity, 10);

  const opDoc = await db.collection(collections.stockOperations).findOne({ type: 'scrap' });
  assert.equal(opDoc.state, 'draft');
  assert.equal(opDoc.scrapDetail, undefined);

  const val = await req(server, 'GET', '/warehouse/valuation');
  assert.equal(valuationFor(val.json, 'TOWAR-S').value, 140);
});
