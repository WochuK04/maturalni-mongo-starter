// Test integracyjny rezerwacji: otwarta dostawa (draft) rezerwuje stan → widoczne
// w GET /warehouse/stock (reserved/available) i wpływa na computeReplenishment
// (below/toOrder liczone od dostępnego). Izolowana baza, forge admin, dropDatabase.
// Uruchom: `node --test --test-force-exit`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DB_NAME = 'maturalni_equipment_reservations_test';

const { default: app } = await import('../src/index.js');
const { getDb, closeDb } = await import('../src/db.js');
const { collections } = await import('../src/schema.js');
const { seedStandardLocations } = await import('../src/stock.js');

function startServer(user) {
  const parent = express();
  parent.use(express.json());
  parent.use((req, _res, next) => { req.user = user; req.isAuthenticated = () => true; next(); });
  parent.use(app);
  return new Promise(resolve => { const s = parent.listen(0, () => resolve(s)); });
}
function get(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, res => {
      let body = ''; res.on('data', c => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, json: body ? JSON.parse(body) : null }));
    }).on('error', reject);
  });
}

const admin = { email: 'admin@maturalni.com', fullName: 'Admin', role: 'admin' };
let server, db, stockLocId;

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  await seedStandardLocations(db);
  const stock = await db.collection(collections.locations).findOne({ code: 'WH/Stock' });
  stockLocId = String(stock._id);

  await db.collection(collections.items).insertOne(
    { itemCode: 'GADZ-1', name: 'Smycz', category: 'gadżet', isActive: true }
  );
  // 10 szt. na stanie w WH/Stock.
  await db.collection(collections.quants).insertOne(
    { itemCode: 'GADZ-1', locationId: stockLocId, lot: null, quantity: 10, reservedQty: 0, updatedAt: new Date() }
  );
  // Otwarta dostawa (draft) na 4 szt. z WH/Stock → rezerwuje 4.
  await db.collection(collections.stockOperations).insertOne({
    reference: 'mag/OUT/0001', type: 'delivery', state: 'draft',
    fromLocationId: stockLocId, toLocationId: null,
    lines: [{ itemCode: 'GADZ-1', quantity: 4 }], createdAt: new Date(), updatedAt: new Date()
  });
  // Reguła min-max: min 8 — bez rezerwacji 10≥8 (OK), z rezerwacją dostępne 6<8 (brak).
  await db.collection(collections.reorderRules).insertOne(
    { scope: 'item', target: 'GADZ-1', minQty: 8, maxQty: 20, isActive: true, note: '' }
  );
  server = await startServer(admin);
});

test.after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.dropDatabase();
  await closeDb();
});

test('GET /warehouse/stock pokazuje reserved i available', async () => {
  const { status, json } = await get(server, '/warehouse/stock');
  assert.equal(status, 200);
  const row = json.find(r => r.itemCode === 'GADZ-1' && r.locationId === stockLocId);
  assert.ok(row, 'jest wiersz GADZ-1 w WH/Stock');
  assert.equal(row.quantity, 10);
  assert.equal(row.reserved, 4);
  assert.equal(row.available, 6);
});

test('Zapotrzebowanie liczy od dostępnego (rezerwacja spycha poniżej minimum)', async () => {
  const { json } = await get(server, '/warehouse/reorder-rules');
  const rule = json.find(r => r.target === 'GADZ-1');
  assert.equal(rule.onHand, 10);
  assert.equal(rule.reserved, 4);
  assert.equal(rule.available, 6);
  assert.equal(rule.below, true);          // 6 < 8
  assert.equal(rule.toOrder, 14);          // max 20 − dostępne 6
});

test('overview: kafelek braków pokazuje dostępne i liczy poniżej minimum', async () => {
  const { json } = await get(server, '/warehouse/overview');
  assert.equal(json.replenishment.below, 1);
  const item = json.replenishment.items.find(i => i.label.includes('GADZ-1') || i.label.includes('Smycz'));
  assert.equal(item.available, 6);
  assert.equal(item.toOrder, 14);
});
