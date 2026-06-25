// Test integracyjny GET /warehouse/aging na izolowanej bazie. Forge `req.user` w
// nadrzędnym Express, własna DB_NAME=…_test, dropDatabase po teście. Wymaga lokalnego
// Mongo. Uruchom: `node --test --test-force-exit`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DB_NAME = 'maturalni_equipment_aging_test';

const { default: app } = await import('../src/index.js');
const { getDb, closeDb } = await import('../src/db.js');
const { collections } = await import('../src/schema.js');

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
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d) => new Date(Date.now() - d * DAY);
let server, db;

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  // Produkt Magazynu z warstwami w różnym wieku; jedna zużyta (qty 0) ma być pominięta.
  await db.collection(collections.items).insertOne({
    itemCode: 'TOWAR-AGE', name: 'Karton', category: 'towar', isActive: true,
    priceBatches: [
      { qty: 5, unitPrice: 10, addedAt: daysAgo(3) },    // ≤30
      { qty: 2, unitPrice: 10, addedAt: daysAgo(200) },  // >180
      { qty: 0, unitPrice: 99, addedAt: daysAgo(400) }   // zużyta → pominięta
    ]
  });
  // Sprzęt spoza Magazynu — nie powinien wejść do raportu.
  await db.collection(collections.items).insertOne({
    itemCode: 'KAM-1', name: 'Kamera', category: 'Kamera', isActive: true,
    priceBatches: [{ qty: 1, unitPrice: 1000, addedAt: daysAgo(500) }]
  });
  server = await startServer(admin);
});

test.after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.dropDatabase();
  await closeDb();
});

test('GET /warehouse/aging grupuje wiek i pomija zużyte oraz nie-magazynowe', async () => {
  const { status, json } = await req(server, 'GET', '/warehouse/aging');
  assert.equal(status, 200);

  const band = Object.fromEntries(json.bands.map(b => [b.key, b]));
  assert.equal(band.le30.qty, 5);
  assert.equal(band.gt180.qty, 2);
  assert.equal(json.totalQty, 7);          // 5 + 2, zużyta (0) pominięta
  assert.equal(json.totalValue, 70);
  assert.equal(json.agedQty, 2);

  // Tylko produkt Magazynu; kamera (spoza Magazynu) odfiltrowana.
  assert.equal(json.productCount, 1);
  assert.equal(json.products[0].itemCode, 'TOWAR-AGE');
  assert.ok(json.products[0].oldestDays >= 200);
});
