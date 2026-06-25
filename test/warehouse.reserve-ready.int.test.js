// Test integracyjny egzekwowania rezerwacji: form-data pokazuje dostępne, a przejście
// operacji w „ready" jest blokowane, gdy przekracza dostępne (on-hand − INNE operacje
// ready). Wersje robocze (draft) nie blokują commitu; self jest wykluczone.
// Izolowana baza, forge admin, dropDatabase. Uruchom: `node --test --test-force-exit`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { ObjectId } from 'mongodb';

process.env.DB_NAME = 'maturalni_equipment_reserveready_test';

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
function call(server, method, path, body) {
  const { port } = server.address();
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const r = http.request({
      host: '127.0.0.1', port, path, method,
      headers: payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}
    }, res => {
      let b = ''; res.on('data', c => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, json: b ? JSON.parse(b) : null }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

const admin = { email: 'admin@maturalni.com', fullName: 'Admin', role: 'admin' };
const delivery = (state, qty) => ({
  reference: `mag/OUT/${state}-${qty}`, type: 'delivery', state,
  fromLocationId: STOCK, toLocationId: null,
  lines: [{ itemCode: 'GADZ-1', quantity: qty }], createdAt: new Date(), updatedAt: new Date()
});
let server, db, STOCK, opAId, opBId, opCId;

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  await seedStandardLocations(db);
  STOCK = String((await db.collection(collections.locations).findOne({ code: 'WH/Stock' }))._id);

  await db.collection(collections.items).insertOne({ itemCode: 'GADZ-1', name: 'Smycz', category: 'gadżet', isActive: true });
  await db.collection(collections.quants).insertOne({ itemCode: 'GADZ-1', locationId: STOCK, lot: null, quantity: 10, reservedQty: 0, updatedAt: new Date() });

  opAId = String((await db.collection(collections.stockOperations).insertOne(delivery('ready', 6))).insertedId); // zacommitowane 6
  opBId = String((await db.collection(collections.stockOperations).insertOne(delivery('draft', 5))).insertedId);
  opCId = String((await db.collection(collections.stockOperations).insertOne(delivery('draft', 3))).insertedId);
  server = await startServer(admin);
});

test.after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.dropDatabase();
  await closeDb();
});

test('form-data: available = on-hand − rezerwacje (draft+ready)', async () => {
  const { json } = await call(server, 'GET', '/warehouse/form-data');
  const it = json.items.find(i => i.itemCode === 'GADZ-1');
  assert.equal(it.onHand, 10);
  assert.equal(it.reserved, 14);     // 6 + 5 + 3 (draft+ready)
  assert.equal(it.available, 0);
});

test('blokada: ready dla B przekracza dostępne (inne ready = A6 → wolne 4 < 5)', async () => {
  const { status, json } = await call(server, 'PATCH', `/warehouse/operations/${opBId}`, { state: 'ready' });
  assert.equal(status, 400);
  assert.match(json.message, /Za mało dostępnego do rezerwacji/i);
  const b = await db.collection(collections.stockOperations).findOne({ _id: new ObjectId(opBId) });
  assert.equal(b.state, 'draft'); // pozostała robocza
});

test('zezwolenie: ready dla C mieści się (inne ready = A6 → wolne 4 ≥ 3)', async () => {
  const { status } = await call(server, 'PATCH', `/warehouse/operations/${opCId}`, { state: 'ready' });
  assert.equal(status, 200);
});

test('re-ready A nie jest fałszywie blokowane (self wykluczone; inne ready = C3)', async () => {
  const { status } = await call(server, 'PATCH', `/warehouse/operations/${opAId}`, { state: 'ready' });
  assert.equal(status, 200); // wolne = 10 − 3 (C) = 7 ≥ 6
});
