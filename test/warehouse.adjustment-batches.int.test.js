// Test integracyjny: inwentaryzacja (adjustment) uzgadnia partie cenowe — ubytek
// zdejmuje FIFO, nadwyżka dopisuje warstwę po ostatnim koszcie; cofnięcie odwraca obie.
// Izolowana baza, forge req.user (admin). Wymaga lokalnego Mongo. Uruchom z --test-force-exit.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DB_NAME = 'maturalni_equipment_adjustbatch_test';

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
let server, db, stockId, supplierId, opShortId, opSurpId;

const valuationFor = (json, code) =>
  (json.categories || []).flatMap(c => c.products).find(p => p.itemCode === code);

async function makeAdjustment(itemCode, countedQty) {
  const reference = await nextReference(db, 'mag/ADJ');
  const now = new Date();
  const { insertedId } = await db.collection(collections.stockOperations).insertOne({
    reference, type: 'adjustment', state: 'ready',
    fromLocationId: null, toLocationId: stockId,
    lines: [{ itemCode, locationId: stockId, countedQty }],
    createdByEmail: admin.email, createdAt: now, updatedAt: now
  });
  return String(insertedId);
}

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  const byCode = await seedStandardLocations(db);
  stockId = String(byCode.get('WH/Stock')._id);
  supplierId = String(byCode.get('VIRT/Suppliers')._id);

  // Ubytek: 6×10 + 4×20 = 10 szt., wartość 140 zł.
  await db.collection(collections.items).insertOne({
    itemCode: 'TOWAR-SHORT', name: 'Karton', category: 'towar', quantity: 10, isActive: true,
    priceBatches: [{ qty: 6, unitPrice: 10, note: 'p1', addedAt: new Date() }, { qty: 4, unitPrice: 20, note: 'p2', addedAt: new Date() }]
  });
  await applyMove(db, { itemCode: 'TOWAR-SHORT', fromLocationId: supplierId, toLocationId: stockId, quantity: 10, kind: 'receipt' });

  // Nadwyżka: 5×8 = 5 szt., wartość 40 zł. Ostatni koszt = 8 zł.
  await db.collection(collections.items).insertOne({
    itemCode: 'TOWAR-SURP', name: 'Taśma', category: 'towar', quantity: 5, isActive: true,
    priceBatches: [{ qty: 5, unitPrice: 8, note: 'p1', addedAt: new Date() }]
  });
  await applyMove(db, { itemCode: 'TOWAR-SURP', fromLocationId: supplierId, toLocationId: stockId, quantity: 5, kind: 'receipt' });

  opShortId = await makeAdjustment('TOWAR-SHORT', 7); // policzono 7 z 10 → ubytek 3
  opSurpId = await makeAdjustment('TOWAR-SURP', 8);   // policzono 8 z 5 → nadwyżka 3
  server = await startServer(admin);
});

test.after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.dropDatabase();
  await closeDb();
});

test('ubytek: zatwierdzenie zdejmuje partie FIFO i obniża wycenę', async () => {
  const { status } = await req(server, 'POST', `/warehouse/operations/${opShortId}/validate`);
  assert.equal(status, 200);

  const item = await db.collection(collections.items).findOne({ itemCode: 'TOWAR-SHORT' });
  assert.equal(item.priceBatches.reduce((s, b) => s + b.qty, 0), 7); // FIFO zdjęło 3 z warstwy 10 zł
  assert.equal(item.quantity, 7);

  const opDoc = await db.collection(collections.stockOperations).findOne({ 'lines.itemCode': 'TOWAR-SHORT', type: 'adjustment' });
  assert.equal(opDoc.state, 'done');
  assert.equal(opDoc.adjustmentDetail[0].diff, -3);
  assert.deepEqual(opDoc.adjustmentDetail[0].consumed, [{ qty: 3, unitPrice: 10 }]);

  const val = await req(server, 'GET', '/warehouse/valuation');
  assert.equal(valuationFor(val.json, 'TOWAR-SHORT').value, 110); // 3×10 + 4×20

  const q = await db.collection(collections.quants).findOne({ itemCode: 'TOWAR-SHORT', locationId: stockId });
  assert.equal(q.quantity, 7);
});

test('ubytek: cofnięcie oddaje partie i przywraca wycenę', async () => {
  const { status } = await req(server, 'POST', `/warehouse/operations/${opShortId}/reverse`);
  assert.equal(status, 200);
  const item = await db.collection(collections.items).findOne({ itemCode: 'TOWAR-SHORT' });
  assert.equal(item.priceBatches.reduce((s, b) => s + b.qty, 0), 10);
  assert.equal(item.quantity, 10);
  const val = await req(server, 'GET', '/warehouse/valuation');
  assert.equal(valuationFor(val.json, 'TOWAR-SHORT').value, 140);
});

test('nadwyżka: zatwierdzenie dopisuje warstwę po ostatnim koszcie', async () => {
  const { status } = await req(server, 'POST', `/warehouse/operations/${opSurpId}/validate`);
  assert.equal(status, 200);

  const item = await db.collection(collections.items).findOne({ itemCode: 'TOWAR-SURP' });
  assert.equal(item.priceBatches.reduce((s, b) => s + b.qty, 0), 8); // 5 + dopisane 3
  assert.equal(item.quantity, 8);
  const added = item.priceBatches.find(b => String(b.note || '').includes('nadwyżka inwentaryzacji'));
  assert.ok(added && added.qty === 3 && added.unitPrice === 8); // ostatni znany koszt = 8 zł

  const val = await req(server, 'GET', '/warehouse/valuation');
  assert.equal(valuationFor(val.json, 'TOWAR-SURP').value, 64); // 8 szt × 8 zł
});

test('nadwyżka: cofnięcie zdejmuje dopisaną warstwę', async () => {
  const { status } = await req(server, 'POST', `/warehouse/operations/${opSurpId}/reverse`);
  assert.equal(status, 200);
  const item = await db.collection(collections.items).findOne({ itemCode: 'TOWAR-SURP' });
  assert.equal(item.priceBatches.reduce((s, b) => s + b.qty, 0), 5);
  assert.equal(item.quantity, 5);
  assert.ok(!item.priceBatches.some(b => String(b.note || '').includes('nadwyżka inwentaryzacji')));
  const val = await req(server, 'GET', '/warehouse/valuation');
  assert.equal(valuationFor(val.json, 'TOWAR-SURP').value, 40);
});
