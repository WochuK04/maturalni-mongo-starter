import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { collections } from '../schema.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { onboardingStepView, onboardingStepComplete } from '../lib/onboarding.js';

// Osobisty checklist: globalna lista kroków (admin edytuje) + postęp per użytkownik
// (kolekcja onboardingProgress). Każdy zalogowany widzi swoją listę i odhacza kroki;
// edycja listy kroków oraz panel osób — tylko admin.
export function registerOnboardingRoutes(app) {
  app.get('/onboarding', requireAuth, async (req, res) => {
    const db = await getDb();
    const steps = await db.collection(collections.onboardingSteps)
      .find({ isActive: { $ne: false } }).sort({ sortOrder: 1, createdAt: 1 }).toArray();
    const progress = await db.collection(collections.onboardingProgress)
      .find({ userEmail: req.user.email }).toArray();
    const byStep = new Map(progress.map(p => [String(p.stepId), p]));
    res.json(steps.map(s => {
      const p = byStep.get(String(s._id));
      const owner = s.owner === 'til' ? 'til' : 'self';
      const state = owner === 'til' ? (p?.state || 'pending') : null;
      return {
        ...onboardingStepView(s),
        done: onboardingStepComplete({ owner }, p),
        state,
        completedAt: (p && p.completedAt) || null
      };
    }));
  });

  app.get('/onboarding/summary', requireAuth, async (req, res) => {
    const db = await getDb();
    const steps = await db.collection(collections.onboardingSteps)
      .find({ isActive: { $ne: false } }, { projection: { owner: 1 } }).toArray();
    const total = steps.length;
    const progress = await db.collection(collections.onboardingProgress)
      .find({ userEmail: req.user.email }).toArray();
    const byStep = new Map(progress.map(p => [String(p.stepId), p]));
    const done = steps.filter(s => onboardingStepComplete({ owner: s.owner === 'til' ? 'til' : 'self' }, byStep.get(String(s._id)))).length;
    res.json({ total, done, pct: total ? Math.round((done / total) * 100) : 0 });
  });

  // Akcja pracownika na kroku. self: {done} (odhaczenie). til: {action:'request'|'confirm'}
  // (pending→requested→[TiL przyznaje granted]→confirmed). „granted" ustawia tylko TiL
  // (endpoint admina) — pracownik nie może sam potwierdzić bez przyznania.
  app.post('/onboarding/:stepId/toggle', requireAuth, async (req, res) => {
    const db = await getDb();
    let stepId;
    try { stepId = new ObjectId(req.params.stepId); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    const step = await db.collection(collections.onboardingSteps).findOne({ _id: stepId });
    if (!step) return res.status(404).json({ message: 'Krok nie istnieje' });
    const filter = { userEmail: req.user.email, stepId: String(stepId) };
    const now = new Date();

    if (step.owner === 'til') {
      const current = (await db.collection(collections.onboardingProgress).findOne(filter))?.state || 'pending';
      const action = req.body.action;
      let state;
      if (action === 'request' && current === 'pending') state = 'requested';
      else if (action === 'confirm' && current === 'granted') state = 'confirmed';
      else if (action === 'unconfirm' && current === 'confirmed') state = 'granted';
      else return res.status(400).json({ message: 'Niedozwolone przejście dla tego kroku' });
      await db.collection(collections.onboardingProgress).updateOne(
        filter,
        { $set: { state, completedAt: state === 'confirmed' ? now : null, updatedAt: now } },
        { upsert: true }
      );
      return res.json({ message: 'Zapisano', state });
    }

    const done = req.body.done !== false;
    await db.collection(collections.onboardingProgress).updateOne(
      filter,
      { $set: { done, completedAt: done ? now : null, updatedAt: now } },
      { upsert: true }
    );
    res.json({ message: done ? 'Odhaczono' : 'Cofnięto', done });
  });

  // --- Admin: zarządzanie krokami onboardingu ---
  app.post('/onboarding/steps', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Podaj tytuł kroku' });
    const now = new Date();
    const doc = {
      title,
      description: String(req.body.description || '').trim(),
      category: String(req.body.category || 'Ogólne').trim() || 'Ogólne',
      url: String(req.body.url || '').trim(),
      owner: req.body.owner === 'til' ? 'til' : 'self',
      sortOrder: Number(req.body.sortOrder) || 0,
      isActive: true,
      createdByEmail: req.user.email,
      createdAt: now,
      updatedAt: now
    };
    const { insertedId } = await db.collection(collections.onboardingSteps).insertOne(doc);
    res.status(201).json({ id: String(insertedId), ...onboardingStepView({ ...doc, _id: insertedId }) });
  });

  app.patch('/onboarding/steps/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    const update = { updatedAt: new Date() };
    if (req.body.title !== undefined) {
      const t = String(req.body.title || '').trim();
      if (!t) return res.status(400).json({ message: 'Tytuł nie może być pusty' });
      update.title = t;
    }
    if (req.body.description !== undefined) update.description = String(req.body.description || '').trim();
    if (req.body.category !== undefined) update.category = String(req.body.category || 'Ogólne').trim() || 'Ogólne';
    if (req.body.url !== undefined) update.url = String(req.body.url || '').trim();
    if (req.body.owner !== undefined) update.owner = req.body.owner === 'til' ? 'til' : 'self';
    if (req.body.sortOrder !== undefined) update.sortOrder = Number(req.body.sortOrder) || 0;
    const r = await db.collection(collections.onboardingSteps).updateOne({ _id: id }, { $set: update });
    if (!r.matchedCount) return res.status(404).json({ message: 'Krok nie istnieje' });
    res.json({ message: 'Zapisano' });
  });

  app.delete('/onboarding/steps/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
    await db.collection(collections.onboardingSteps).updateOne({ _id: id }, { $set: { isActive: false, updatedAt: new Date() } });
    res.json({ message: 'Usunięto' });
  });

  // --- Admin/TiL: panel postępu onboardingu osób ---
  // Podmiotem są osoby z onboardingStatus='in_progress' (admin je startuje). Istniejący
  // użytkownicy bez tego statusu = poza panelem (zaliczony/nie dotyczy).
  app.get('/admin/onboarding', requireAuth, requireAdmin, async (_req, res) => {
    const db = await getDb();
    const steps = await db.collection(collections.onboardingSteps)
      .find({ isActive: { $ne: false } }).sort({ sortOrder: 1, createdAt: 1 }).toArray();
    const stepViews = steps.map(onboardingStepView);
    const people = await db.collection(collections.users)
      .find({ onboardingStatus: 'in_progress' }, { projection: { email: 1, fullName: 1, onboardingStartedAt: 1 } })
      .sort({ onboardingStartedAt: 1, fullName: 1 }).toArray();
    const emails = people.map(p => p.email);
    const progress = emails.length
      ? await db.collection(collections.onboardingProgress).find({ userEmail: { $in: emails } }).toArray()
      : [];
    const byUser = new Map();
    for (const p of progress) {
      if (!byUser.has(p.userEmail)) byUser.set(p.userEmail, new Map());
      byUser.get(p.userEmail).set(String(p.stepId), p);
    }
    res.json({
      steps: stepViews,
      people: people.map(u => {
        const prog = byUser.get(u.email) || new Map();
        const stepStates = steps.map(s => {
          const p = prog.get(String(s._id));
          const owner = s.owner === 'til' ? 'til' : 'self';
          return { stepId: String(s._id), owner, state: owner === 'til' ? (p?.state || 'pending') : null, done: onboardingStepComplete({ owner }, p) };
        });
        const done = stepStates.filter(s => s.done).length;
        const total = steps.length;
        return {
          email: u.email, fullName: u.fullName || u.email,
          startedAt: u.onboardingStartedAt || null,
          total, done, pct: total ? Math.round((done / total) * 100) : 0,
          steps: stepStates
        };
      })
    });
  });

  app.post('/admin/onboarding/start', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Podaj e-mail osoby' });
    const r = await db.collection(collections.users).updateOne(
      { email },
      { $set: { onboardingStatus: 'in_progress', onboardingStartedAt: new Date(), updatedAt: new Date() } }
    );
    if (!r.matchedCount) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
    res.json({ message: 'Rozpoczęto onboarding' });
  });

  app.post('/admin/onboarding/finish', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Podaj e-mail osoby' });
    await db.collection(collections.users).updateOne(
      { email },
      { $set: { onboardingStatus: 'done', onboardingFinishedAt: new Date(), updatedAt: new Date() } }
    );
    res.json({ message: 'Zakończono onboarding' });
  });

  // TiL przyznaje/cofa krok dostępowo-sprzętowy dla konkretnej osoby.
  app.post('/admin/onboarding/grant', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const email = String(req.body.email || '').trim().toLowerCase();
    let stepId;
    try { stepId = new ObjectId(req.body.stepId); } catch { return res.status(400).json({ message: 'Niepoprawny krok' }); }
    const step = await db.collection(collections.onboardingSteps).findOne({ _id: stepId });
    if (!step) return res.status(404).json({ message: 'Krok nie istnieje' });
    if (step.owner !== 'til') return res.status(400).json({ message: 'To nie jest krok TiL (dostęp/sprzęt)' });
    const filter = { userEmail: email, stepId: String(stepId) };
    const current = (await db.collection(collections.onboardingProgress).findOne(filter))?.state || 'pending';
    const action = req.body.action === 'revoke' ? 'revoke' : 'grant';
    let state;
    if (action === 'grant' && (current === 'pending' || current === 'requested')) state = 'granted';
    else if (action === 'revoke' && (current === 'granted' || current === 'confirmed')) state = 'requested';
    else return res.status(400).json({ message: 'Niedozwolone przejście' });
    await db.collection(collections.onboardingProgress).updateOne(
      filter, { $set: { state, updatedAt: new Date() } }, { upsert: true }
    );
    res.json({ message: action === 'grant' ? 'Oznaczono jako przyznane' : 'Cofnięto przyznanie', state });
  });
}
