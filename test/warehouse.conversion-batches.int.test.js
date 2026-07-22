// Test integracyjny: konwersja (przeklasyfikowanie między kategoriami) w obie strony.
// Regresja #konwersja: gdy CEL ma stan bez pokrycia w partiach cenowych (np. import
// z Odoo: quantity>0, priceBatches=[]), zatwierdzenie NIE może skasować istniejącego
// stanu celu — musi go zachować (partia „Stan początkowy" 0 zł) i dodać przetworzone
// sztuki. Sprawdza też cofnięcie (cel wraca do stanu sprzed konwersji). Izolowana baza,
// forge req.user (admin). Wymaga lokalnego Mongo. Uruchom: `node --test --test-force-exit`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DB_NAME = 'maturalni_equipment_conversion_test';

const { default: app } = await import('../src/index.js');
const { getDb, closeDb } = await import('../src/db.js');
const { collections } = await import('../src/schema.js');
const { seedStandardLocations, applyMove } = await import('../src/stock.js');

function startServer(user) {
  const parent = express();
  parent.use(express.json());
  parent.use((req, _res, next) => { req.user = user; req.isAuthenticated = () => true; next(); });
  parent.use(app);
  return new Promise(resolve => { const s = parent.listen(0, () => resolve(s)); });
}

function req(server, method, path, body) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json' } }, res => {
      let b = '';
      res.on('data', c => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, json: b ? JSON.parse(b) : null }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const admin = { email: 'admin@maturalni.com', fullName: 'Admin', role: 'admin' };
let server, db, stockId, supplierId;

const qtyOf = async (code) => (await db.collection(collections.items).findOne({ itemCode: code })).quantity;

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  const byCode = await seedStandardLocations(db);
  stockId = String(byCode.get('WH/Stock')._id);
  supplierId = String(byCode.get('VIRT/Suppliers')._id);
  server = await startServer(admin);
});

test.after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.dropDatabase();
  await closeDb();
});

async function seedItem(code, category, qty, price, withBatches = true) {
  await db.collection(collections.items).insertOne({
    itemCode: code, name: code, category, quantity: qty, isActive: true,
    priceBatches: withBatches && qty > 0 ? [{ qty, unitPrice: price, note: 'p', addedAt: new Date() }] : []
  });
  if (qty > 0) await applyMove(db, { itemCode: code, fromLocationId: supplierId, toLocationId: stockId, quantity: qty, kind: 'receipt' });
}

async function convert(lines) {
  const c = await req(server, 'POST', '/warehouse/operations', { type: 'conversion', lines });
  assert.equal(c.status, 201);
  const v = await req(server, 'POST', `/warehouse/operations/${c.json.id}/validate`);
  assert.equal(v.status, 200);
  return c.json.id;
}

test('konwersja gadżet→towar: cel z partiami dostaje +ilość', async () => {
  await seedItem('GA', 'gadżet', 10, 5);
  await seedItem('TA', 'towar', 3, 8);
  await convert([{ itemCode: 'GA', targetItemCode: 'TA', quantity: 4 }]);
  assert.equal(await qtyOf('GA'), 6, 'źródło zdjęte');
  assert.equal(await qtyOf('TA'), 7, 'cel dodany (3+4)');
});

test('konwersja do celu LEGACY (stan bez partii) zachowuje istniejący stan', async () => {
  await seedItem('GB', 'gadżet', 10, 5);
  await seedItem('TB', 'towar', 5, 0, false); // 5 szt., priceBatches: []
  const opId = await convert([{ itemCode: 'GB', targetItemCode: 'TB', quantity: 4 }]);

  assert.equal(await qtyOf('GB'), 6, 'źródło zdjęte');
  assert.equal(await qtyOf('TB'), 9, 'cel: 5 istniejących + 4 przetworzone (NIE nadpisane do 4)');

  const quant = await db.collection(collections.quants).findOne({ itemCode: 'TB', locationId: stockId });
  assert.equal(quant.quantity, 9, 'quant realny zgodny z ilością');

  // Cofnięcie oddaje stan celu sprzed konwersji.
  const r = await req(server, 'POST', `/warehouse/operations/${opId}/reverse`);
  assert.equal(r.status, 200);
  assert.equal(await qtyOf('GB'), 10, 'źródło oddane');
  assert.equal(await qtyOf('TB'), 5, 'cel wrócił do 5');
});

test('konwersja: dwie linie do tego samego celu legacy sumują się', async () => {
  await seedItem('GE', 'gadżet', 10, 5);
  await seedItem('TE', 'towar', 5, 0, false);
  await convert([
    { itemCode: 'GE', targetItemCode: 'TE', quantity: 2 },
    { itemCode: 'GE', targetItemCode: 'TE', quantity: 3 }
  ]);
  assert.equal(await qtyOf('GE'), 5, 'źródło: 10-2-3');
  assert.equal(await qtyOf('TE'), 10, 'cel: 5 + 2 + 3');
});
