import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { collections } from '../schema.js';
import { requireAuth, requireManager, requireAdmin } from '../auth.js';
import { accessView, accessDocFromBody } from '../lib/accesses.js';
import { ACCESS_STATUS } from '../lib/access-dicts.js';
import { busFactor, annualCost, orphans, accessMapSummary } from '../lib/access-queries.js';

// Dostępy (osoba × licencja). Odczyt: kierownik/admin. Zapis: admin.
export function registerAccessRoutes(app) {
  // Lista z filtrami: ?personEmail=&licenseId=&status=
  app.get('/accesses', requireAuth, requireManager, async (req, res) => {
    const db = await getDb();
    const q = {};
    if (req.query.personEmail) q.personEmail = String(req.query.personEmail).trim().toLowerCase();
    if (req.query.status && ACCESS_STATUS.includes(String(req.query.status))) q.status = String(req.query.status);
    if (req.query.licenseId) { try { q.licenseId = new ObjectId(String(req.query.licenseId)); } catch { /* ignoruj zły id */ } }
    const list = await db.collection(collections.accesses).find(q).sort({ personName: 1, licenseName: 1 }).toArray();
    res.json(list.map(accessView));
  });

  // === Zapytania „Mapy dostępów" (pulpit) — przed :id, by nie kolidowały z trasą /:id ===

  // Kafle pulpitu: liczniki ryzyka + koszt roczny (PLN).
  app.get('/access-map/summary', requireAuth, requireManager, async (_req, res) => {
    const db = await getDb();
    res.json(await accessMapSummary(db));
  });

  // (3) Bus factor: licencje krytyczne z dokładnie jedną osobą Owner/Admin.
  app.get('/access-map/bus-factor', requireAuth, requireManager, async (_req, res) => {
    const db = await getDb();
    res.json(await busFactor(db));
  });

  // (4) Koszt roczny: suma po walutach + PLN.
  app.get('/access-map/annual-cost', requireAuth, requireManager, async (_req, res) => {
    const db = await getDb();
    res.json(await annualCost(db));
  });

  // (5) Sieroty: licencje bez właściciela biznesowego i bez tożsamości.
  app.get('/access-map/orphans', requireAuth, requireManager, async (_req, res) => {
    const db = await getDb();
    res.json(await orphans(db));
  });

  app.post('/accesses', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const email = String(req.body.personEmail || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Wskaż osobę' });
    if (!req.body.licenseId) return res.status(400).json({ message: 'Wskaż licencję' });
    const now = new Date();
    const doc = await accessDocFromBody(db, req.body, {
      status: 'Do weryfikacji', role: 'Nie wiem', createdAt: now, updatedAt: now
    });
    if (!doc.licenseId) return res.status(400).json({ message: 'Niepoprawna licencja' });
    try {
      const { insertedId } = await db.collection(collections.accesses).insertOne(doc);
      res.status(201).json(accessView({ ...doc, _id: insertedId }));
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Ta osoba ma już dostęp do tej licencji' });
      throw e;
    }
  });

  // Akcja masowa: ustaw status dla wielu dostępów. Body: { ids:[], status }.
  app.post('/accesses/bulk-status', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const status = String(req.body.status || '');
    if (!ACCESS_STATUS.includes(status)) return res.status(400).json({ message: 'Niepoprawny status' });
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : [])
      .map(x => { try { return new ObjectId(String(x)); } catch { return null; } }).filter(Boolean);
    if (!ids.length) return res.status(400).json({ message: 'Zaznacz co najmniej jeden dostęp' });
    const now = new Date();
    const set = { status, updatedAt: now };
    if (status === 'Odebrany' || status === 'Do weryfikacji') set.reviewedAt = now;
    const r = await db.collection(collections.accesses).updateMany({ _id: { $in: ids } }, { $set: set });
    res.json({ message: 'Zapisano', modified: r.modifiedCount });
  });

  app.patch('/accesses/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    const update = await accessDocFromBody(db, req.body, { updatedAt: new Date() });
    try {
      const r = await db.collection(collections.accesses).updateOne({ _id: id }, { $set: update });
      if (!r.matchedCount) return res.status(404).json({ message: 'Dostęp nie istnieje' });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Ta osoba ma już dostęp do tej licencji' });
      throw e;
    }
    res.json({ message: 'Zapisano' });
  });

  app.delete('/accesses/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    await db.collection(collections.accesses).deleteOne({ _id: id });
    res.json({ message: 'Usunięto' });
  });
}
