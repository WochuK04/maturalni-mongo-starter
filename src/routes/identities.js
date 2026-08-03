import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { collections } from '../schema.js';
import { requireAuth, requireManager, requireAdmin } from '../auth.js';
import { identityView, identityDocFromBody } from '../lib/identities.js';
import { blastRadius } from '../lib/access-queries.js';

// Tożsamości (konta logowania). Odczyt: kierownik/admin. Zapis: admin.
export function registerIdentityRoutes(app) {
  // Lista tożsamości + licznik zależnych licencji (dla widoku „co od tego zależy").
  app.get('/identities', requireAuth, requireManager, async (_req, res) => {
    const db = await getDb();
    const list = await db.collection(collections.identities).find({}).sort({ address: 1 }).toArray();
    const counts = await db.collection(collections.licenses).aggregate([
      { $match: { identityId: { $ne: null }, isActive: { $ne: false } } },
      { $group: { _id: '$identityId', n: { $sum: 1 } } }
    ]).toArray();
    const byId = new Map(counts.map(c => [String(c._id), c.n]));
    res.json(list.map(i => ({ ...identityView(i), dependentLicenses: byId.get(String(i._id)) || 0 })));
  });

  // (1) Zasięg awarii: licencje zależne od tożsamości + osoby mające do nich dostęp.
  app.get('/identities/:id/blast-radius', requireAuth, requireManager, async (req, res) => {
    const db = await getDb();
    const result = await blastRadius(db, req.params.id);
    if (!result) return res.status(404).json({ message: 'Tożsamość nie istnieje' });
    res.json(result);
  });

  app.post('/identities', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const address = String(req.body.address || '').trim();
    if (!address) return res.status(400).json({ message: 'Podaj adres / login tożsamości' });
    const now = new Date();
    const doc = await identityDocFromBody(db, req.body, { address, createdAt: now, updatedAt: now });
    try {
      const { insertedId } = await db.collection(collections.identities).insertOne(doc);
      res.status(201).json(identityView({ ...doc, _id: insertedId }));
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Tożsamość o tym adresie już istnieje' });
      throw e;
    }
  });

  app.patch('/identities/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    if (req.body.address !== undefined && !String(req.body.address).trim()) {
      return res.status(400).json({ message: 'Adres nie może być pusty' });
    }
    const update = await identityDocFromBody(db, req.body, { updatedAt: new Date() });
    const r = await db.collection(collections.identities).updateOne({ _id: id }, { $set: update });
    if (!r.matchedCount) return res.status(404).json({ message: 'Tożsamość nie istnieje' });
    res.json({ message: 'Zapisano' });
  });

  app.delete('/identities/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    // Nie usuwamy tożsamości, od której coś zależy — odłącz najpierw licencje.
    const dep = await db.collection(collections.licenses).countDocuments({ identityId: id, isActive: { $ne: false } });
    if (dep) return res.status(409).json({ message: `Nie można usunąć — zależy ${dep} licencji` });
    await db.collection(collections.identities).deleteOne({ _id: id });
    res.json({ message: 'Usunięto' });
  });
}
