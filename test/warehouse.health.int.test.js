// Test integracyjny GET /warehouse/health + POST /warehouse/health/recompute na
// izolowanej bazie. Forge `req.user` (admin) w nadrzędnym Express, własna DB_NAME=…_test,
// dropDatabase po teście. Wymaga lokalnego Mongo. Uruchom: `node --test --test-force-exit`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DB_NAME = 'maturalni_equipment_health_test';

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
  const payload = body != null ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const headers = {};
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
    const r = http.request({ host: '127.0.0.1', port, path, method, headers }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

const admin = { email: 'admin@maturalni.com', fullName: 'Admin', role: 'admin' };
let server, db, stockId, supplierId;

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  const byCode = await seedStandardLocations(db);
  stockId = String(byCode.get('WH/Stock')._id);
  supplierId = String(byCode.get('VIRT/Suppliers')._id);

  // TOWAR-1: cache (99) rozjeżdża się z realnym stanem — jeden ruch przyjęcia daje quant 4.
  await db.collection(collections.items).insertOne(
    { itemCode: 'TOWAR-1', name: 'Karton', category: 'towar', quantity: 99, priceBatches: [], isActive: true }
  );
  await applyMove(db, { itemCode: 'TOWAR-1', fromLocationId: supplierId, toLocationId: stockId, quantity: 4, kind: 'receipt' });

  // TOWAR-2: cache i quant zgodne (-3), ale quant ujemny na stanie realnym → anomalia.
  await db.collection(collections.items).insertOne(
    { itemCode: 'TOWAR-2', name: 'Taśma', category: 'towar', quantity: -3, priceBatches: [], isActive: true }
  );
  await db.collection(collections.quants).insertOne(
    { itemCode: 'TOWAR-2', locationId: stockId, lot: null, quantity: -3, reservedQty: 0, updatedAt: new Date() }
  );

  // Quant-sierota: itemCode bez dokumentu w items.
  await db.collection(collections.quants).insertOne(
    { itemCode: 'GHOST', locationId: stockId, lot: null, quantity: 7, reservedQty: 0, updatedAt: new Date() }
  );

  server = await startServer(admin);
});

test.after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.dropDatabase();
  await closeDb();
});

test('GET /warehouse/health wykrywa rozjazd, ujemny quant i sierotę', async () => {
  const { status, json } = await req(server, 'GET', '/warehouse/health');
  assert.equal(status, 200);

  const m = json.mismatches.find(x => x.itemCode === 'TOWAR-1');
  assert.ok(m, 'TOWAR-1 powinien być w rozjazdach');
  assert.equal(m.cacheQty, 99);
  assert.equal(m.quantStockSum, 4);
  assert.ok(m.issues.includes('cache_vs_quant'));

  assert.ok(json.negativeQuants.some(n => n.itemCode === 'TOWAR-2' && n.quantity === -3));
  const orphan = json.orphanQuants.find(o => o.itemCode === 'GHOST');
  assert.ok(orphan && orphan.reasons.includes('item'), 'GHOST to sierota (nieznany itemCode)');

  assert.equal(json.summary.ok, false);
});

test('POST recompute {itemCode} odtwarza quanty z ruchów i synchronizuje cache', async () => {
  const { status, json } = await req(server, 'POST', '/warehouse/health/recompute', { itemCode: 'TOWAR-1' });
  assert.equal(status, 200);
  assert.equal(json.scope, 'item');

  // Cache zsynchronizowany do realnego stanu (4) — TOWAR-1 znika z rozjazdów.
  const item = await db.collection(collections.items).findOne({ itemCode: 'TOWAR-1' });
  assert.equal(item.quantity, 4);
  const after = (await req(server, 'GET', '/warehouse/health')).json;
  assert.ok(!after.mismatches.some(x => x.itemCode === 'TOWAR-1'));

  // Ślad w audycie.
  const audit = await db.collection(collections.auditLogs).findOne({ actionType: 'warehouse_health_recompute', entityId: 'TOWAR-1' });
  assert.ok(audit);
});

test('POST recompute bez itemCode → pełne przeliczenie (scope all)', async () => {
  const { status, json } = await req(server, 'POST', '/warehouse/health/recompute');
  assert.equal(status, 200);
  assert.equal(json.scope, 'all');
  assert.ok(Number.isInteger(json.recomputed));
});

test('POST recompute nieistniejącego produktu → 404', async () => {
  const { status } = await req(server, 'POST', '/warehouse/health/recompute', { itemCode: 'NIE-MA-TAKIEGO' });
  assert.equal(status, 404);
});
