import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { collections } from '../schema.js';
import { requireAuth, requireManager, requireAdmin } from '../auth.js';
import { licenseView, licenseDocFromBody } from '../lib/licenses.js';

// Ewidencja licencji/subskrypcji. Odczyt: kierownik/admin. Zapis: admin.
export function registerLicenseRoutes(app) {
  app.get('/licenses', requireAuth, requireManager, async (_req, res) => {
    const db = await getDb();
    const now = new Date();
    const list = await db.collection(collections.licenses)
      .find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray();
    res.json(list.map(l => licenseView(l, now)));
  });

  app.get('/licenses/summary', requireAuth, requireManager, async (_req, res) => {
    const db = await getDb();
    const now = new Date();
    const list = await db.collection(collections.licenses)
      .find({ isActive: { $ne: false } }).toArray();
    const views = list.map(l => licenseView(l, now));
    const live = views.filter(v => v.status !== 'cancelled');
    const monthlyTotal = Math.round(live.reduce((s, v) => s + v.monthlyCost, 0) * 100) / 100;
    const upcoming = live.filter(v => v.daysToRenewal != null && v.daysToRenewal >= 0 && v.daysToRenewal <= 30).length;
    const overdue = live.filter(v => v.daysToRenewal != null && v.daysToRenewal < 0).length;
    res.json({
      count: views.length,
      activeCount: live.length,
      monthlyTotal,
      yearlyTotal: Math.round(monthlyTotal * 12 * 100) / 100,
      upcomingCount: upcoming,
      overdueCount: overdue
    });
  });

  app.post('/licenses', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Podaj nazwę licencji' });
    const now = new Date();
    const doc = await licenseDocFromBody(db, req.body, {
      name, costAmount: 0, costCycle: 'monthly', status: 'active', assignedTo: [],
      isActive: true, createdByEmail: req.user.email, createdAt: now, updatedAt: now
    });
    const { insertedId } = await db.collection(collections.licenses).insertOne(doc);
    res.status(201).json({ id: String(insertedId), ...licenseView({ ...doc, _id: insertedId }) });
  });

  app.patch('/licenses/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    if (req.body.name !== undefined && !String(req.body.name).trim()) {
      return res.status(400).json({ message: 'Nazwa nie może być pusta' });
    }
    const update = await licenseDocFromBody(db, req.body, { updatedAt: new Date() });
    const r = await db.collection(collections.licenses).updateOne({ _id: id }, { $set: update });
    if (!r.matchedCount) return res.status(404).json({ message: 'Licencja nie istnieje' });
    res.json({ message: 'Zapisano' });
  });

  app.delete('/licenses/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    await db.collection(collections.licenses).updateOne({ _id: id }, { $set: { isActive: false, updatedAt: new Date() } });
    res.json({ message: 'Usunięto' });
  });
}
