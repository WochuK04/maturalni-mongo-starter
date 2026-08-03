import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { collections } from '../schema.js';
import { requireAuth, requireManager, requireAdmin } from '../auth.js';
import { entityView, entityDocFromBody } from '../lib/entities.js';

// Podmioty / marki. Odczyt: kierownik/admin. Zapis: admin. Brak publicznych tras.
export function registerEntityRoutes(app) {
  app.get('/entities', requireAuth, requireManager, async (_req, res) => {
    const db = await getDb();
    const list = await db.collection(collections.entities).find({}).sort({ name: 1 }).toArray();
    res.json(list.map(entityView));
  });

  app.post('/entities', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Podaj nazwę podmiotu' });
    const now = new Date();
    const doc = entityDocFromBody(req.body, { name, createdAt: now, updatedAt: now });
    try {
      const { insertedId } = await db.collection(collections.entities).insertOne(doc);
      res.status(201).json(entityView({ ...doc, _id: insertedId }));
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Podmiot o tej nazwie już istnieje' });
      throw e;
    }
  });

  app.patch('/entities/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    if (req.body.name !== undefined && !String(req.body.name).trim()) {
      return res.status(400).json({ message: 'Nazwa nie może być pusta' });
    }
    const update = entityDocFromBody(req.body, { updatedAt: new Date() });
    const r = await db.collection(collections.entities).updateOne({ _id: id }, { $set: update });
    if (!r.matchedCount) return res.status(404).json({ message: 'Podmiot nie istnieje' });
    res.json({ message: 'Zapisano' });
  });

  app.delete('/entities/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    // Twardy delete tylko, gdy nic od podmiotu nie zależy — inaczej zostałyby wiszące refy.
    const [lic, ident] = await Promise.all([
      db.collection(collections.licenses).countDocuments({ entityId: id, isActive: { $ne: false } }),
      db.collection(collections.identities).countDocuments({ entityId: id })
    ]);
    if (lic || ident) return res.status(409).json({ message: `Nie można usunąć — zależy ${lic} licencji i ${ident} tożsamości` });
    await db.collection(collections.entities).deleteOne({ _id: id });
    res.json({ message: 'Usunięto' });
  });
}
