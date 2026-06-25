// Test integracyjny POST /warehouse/reorder-rules/:id/replenish na izolowanej bazie.
// Forge `req.user` (admin) w nadrzędnym Express, własna DB_NAME=…_test, dropDatabase
// po teście. Wymaga lokalnego Mongo. Uruchom: `node --test --test-force-exit`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DB_NAME = 'maturalni_equipment_replenish_test';

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
let server, db, belowRuleId, okRuleId, categoryRuleId;

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  await seedStandardLocations(db); // WH/Stock, VIRT/Suppliers itd. (dla resolveLocationId)
  await db.collection(collections.items).insertOne(
    { itemCode: 'GADZ-1', name: 'Smycz', category: 'gadżet', isActive: true }
  );
  // Bez quantów → onHand = 0. minQty 10 > 0 → poniżej minimum; toOrder = max − 0 = 50.
  const below = await db.collection(collections.reorderRules).insertOne(
    { scope: 'item', target: 'GADZ-1', minQty: 10, maxQty: 50, isActive: true, note: '' }
  );
  belowRuleId = String(below.insertedId);
  // Powyżej minimum (minQty 0) → nic do uzupełnienia.
  const ok = await db.collection(collections.reorderRules).insertOne(
    { scope: 'item', target: 'GADZ-1', minQty: 0, maxQty: 5, isActive: true, note: '' }
  );
  okRuleId = String(ok.insertedId);
  // Reguła kategorii — poniżej minimum, ale „Uzupełnij" jej nie obsługuje.
  const cat = await db.collection(collections.reorderRules).insertOne(
    { scope: 'category', target: 'gadżet', minQty: 100, maxQty: 200, isActive: true, note: '' }
  );
  categoryRuleId = String(cat.insertedId);
  server = await startServer(admin);
});

test.after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.dropDatabase();
  await closeDb();
});

test('reguła itemowa poniżej minimum → tworzy draft przyjęcia na toOrder', async () => {
  const { status, json } = await req(server, 'POST', `/warehouse/reorder-rules/${belowRuleId}/replenish`);
  assert.equal(status, 201);
  assert.equal(json.type, 'receipt');
  assert.equal(json.itemCode, 'GADZ-1');
  assert.equal(json.quantity, 50);
  assert.ok(json.reference);

  const op = await db.collection(collections.stockOperations).findOne({ reference: json.reference });
  assert.equal(op.type, 'receipt');
  assert.equal(op.state, 'draft');
  assert.equal(op.originReorderRuleId, belowRuleId);
  assert.equal(op.lines.length, 1);
  assert.deepEqual({ itemCode: op.lines[0].itemCode, quantity: op.lines[0].quantity }, { itemCode: 'GADZ-1', quantity: 50 });
  assert.ok(op.toLocationId, 'przyjęcie ma docelową lokalizację (WH/Stock)');

  // Ślad w audycie.
  const audit = await db.collection(collections.auditLogs).findOne({ actionType: 'reorder_replenish_draft' });
  assert.equal(audit.entityId, String(op._id));
});

test('reguła powyżej minimum → 400 (nic do uzupełnienia)', async () => {
  const { status, json } = await req(server, 'POST', `/warehouse/reorder-rules/${okRuleId}/replenish`);
  assert.equal(status, 400);
  assert.match(json.message, /nie wymaga uzupełnienia/i);
});

test('reguła kategorii → 400 (tylko konkretny sprzęt)', async () => {
  const { status, json } = await req(server, 'POST', `/warehouse/reorder-rules/${categoryRuleId}/replenish`);
  assert.equal(status, 400);
  assert.match(json.message, /konkretnego sprzętu/i);
});

test('niepoprawny / nieistniejący identyfikator', async () => {
  assert.equal((await req(server, 'POST', '/warehouse/reorder-rules/xyz/replenish')).status, 400);
  assert.equal((await req(server, 'POST', '/warehouse/reorder-rules/0123456789abcdef01234567/replenish')).status, 404);
});
