// Test integracyjny cyklu życia wypożyczenia: walidacja wniosku, obieg
// wniosek → akceptacja (admin) → utworzone wypożyczenie + sprzęt „loaned" →
// widoczne w /my/loans → zwrot → sprzęt znów „available".
// Izolowana baza, forge req.user, dropDatabase. Uruchom: `node --test --test-force-exit`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

process.env.DB_NAME = 'maturalni_equipment_loans_test';

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
// Wnioskodawca bez przypisanego kierownika → wniosek trafia wprost do admina.
const requester = { email: 'jan@maturalni.com', fullName: 'Jan Kowalski', role: 'user' };

let db, adminSrv, userSrv;

test.before(async () => {
  db = getDb();
  await db.dropDatabase();
  await db.collection(collections.users).insertMany([
    { ...admin, isActive: true },
    { ...requester, isActive: true, managerEmail: null }
  ]);
  await db.collection(collections.items).insertOne({
    itemCode: 'CAM-1', name: 'Kamera Sony', category: 'Elektronika', quantity: 1,
    operationalStatus: 'available', currentLocation: 'Magazyn', isActive: true
  });
  adminSrv = await startServer(admin);
  userSrv = await startServer(requester);
});
test.after(async () => {
  adminSrv.close(); userSrv.close();
  await db.dropDatabase(); await closeDb();
});

test('POST /loan-requests bez daty zwrotu → 400', async () => {
  const res = await call(userSrv, 'POST', '/loan-requests', { itemCode: 'CAM-1' });
  assert.equal(res.status, 400);
});

test('POST /loan-requests nieistniejący sprzęt → 404', async () => {
  const res = await call(userSrv, 'POST', '/loan-requests', { itemCode: 'NIE-MA', requestedReturnDate: '2099-01-01' });
  assert.equal(res.status, 404);
});

test('pełny obieg: wniosek → akceptacja → wypożyczenie → zwrot', async () => {
  // 1) Wniosek (bez kierownika → pending_admin)
  const created = await call(userSrv, 'POST', '/loan-requests', {
    itemCode: 'CAM-1', requestedReturnDate: '2099-01-01', purpose: 'nagrania'
  });
  assert.equal(created.status, 201);
  const requestId = String(created.json.requestId);

  // widoczny na liście admina jako pending_admin
  const list = await call(adminSrv, 'GET', '/admin/loan-requests');
  assert.equal(list.status, 200);
  const pending = list.json.find(r => String(r._id) === requestId);
  assert.ok(pending, 'wniosek na liście admina');
  assert.equal(pending.status, 'pending_admin');

  // 2) Akceptacja przez admina → tworzy wypożyczenie
  const approved = await call(adminSrv, 'POST', `/admin/loan-requests/${requestId}/approve`, {});
  assert.equal(approved.status, 200);
  const loanId = String(approved.json.loanId);
  assert.ok(loanId && loanId !== 'undefined', 'zwrócono loanId');

  // sprzęt (quantity 1, 1 wydana) → loaned
  const itemAfter = await db.collection(collections.items).findOne({ itemCode: 'CAM-1' });
  assert.equal(itemAfter.operationalStatus, 'loaned');

  // 3) Widoczne w /my/loans wnioskodawcy jako aktywne
  const mine = await call(userSrv, 'GET', '/my/loans');
  assert.equal(mine.status, 200);
  const active = mine.json.find(l => String(l._id) === loanId);
  assert.ok(active, 'wypożyczenie w /my/loans');
  assert.equal(active.status, 'active');

  // 4) Zwrot → sprzęt znów available, wypożyczenie returned
  const returned = await call(userSrv, 'POST', `/loans/return/${loanId}`, { returnLocation: 'Magazyn', returnNote: 'ok' });
  assert.equal(returned.status, 200);

  const itemReturned = await db.collection(collections.items).findOne({ itemCode: 'CAM-1' });
  assert.equal(itemReturned.operationalStatus, 'available');
  const loanDoc = await db.collection(collections.loans).findOne({ itemCode: 'CAM-1' });
  assert.equal(loanDoc.status, 'returned');
});

test('nie można oddać cudzego wypożyczenia (403)', async () => {
  // Nowe wypożyczenie dla requestera, próba zwrotu przez innego usera (nie-admin).
  const created = await call(userSrv, 'POST', '/loan-requests', { itemCode: 'CAM-1', requestedReturnDate: '2099-01-01' });
  const reqId = String(created.json.requestId);
  const approved = await call(adminSrv, 'POST', `/admin/loan-requests/${reqId}/approve`, {});
  const loanId = String(approved.json.loanId);

  const intruderSrv = await startServer({ email: 'obcy@maturalni.com', fullName: 'Obcy', role: 'user' });
  const res = await call(intruderSrv, 'POST', `/loans/return/${loanId}`, {});
  intruderSrv.close();
  assert.equal(res.status, 403);
});
