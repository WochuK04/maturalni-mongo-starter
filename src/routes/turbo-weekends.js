import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import { collections } from '../schema.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { applyMove, refreshItemCache } from '../stock.js';
import { normalizeItemCode } from '../lib/item-code.js';
import { WAREHOUSE_ONLY_CATEGORIES } from '../lib/categories.js';

// === Turbo Weekend / listy pakowania ========================================
// „Wyjazdy": eventy (mapa/busy) + interaktywna checklista pakowania zintegrowana
// ze stanem magazynu (pakowanie odejmuje stan, powrót/cofnięcie dodaje z powrotem).

// Startowa lista pakowania. mode 'per_person' → sztuki = ceil(uczestnicy × value),
// 'fixed' → stała ilość niezależna od liczby osób. roundUpTo zaokrągla w górę do
// wielokrotności (np. woda w zgrzewkach po 6).
const DEFAULT_PACKING_ITEMS = [
  { name: 'Notesy', mode: 'per_person', value: 1, unit: 'szt.', category: 'Materiały' },
  { name: 'Długopisy', mode: 'per_person', value: 1, unit: 'szt.', category: 'Materiały' },
  { name: 'Teczki z materiałami', mode: 'per_person', value: 1, unit: 'szt.', category: 'Materiały' },
  { name: 'Identyfikatory', mode: 'per_person', value: 1, unit: 'szt.', category: 'Materiały' },
  { name: 'Smycze', mode: 'per_person', value: 1, unit: 'szt.', category: 'Materiały' },
  { name: 'Koszulki', mode: 'per_person', value: 1, unit: 'szt.', category: 'Gadżety' },
  { name: 'Woda (butelki)', mode: 'per_person', value: 1.5, unit: 'szt.', roundUpTo: 6, category: 'Katering' },
  { name: 'Przekąski / batony', mode: 'per_person', value: 1, unit: 'szt.', category: 'Katering' },
  { name: 'Markery do flipcharta', mode: 'fixed', value: 10, unit: 'szt.', category: 'Materiały' },
  { name: 'Baner roll-up', mode: 'fixed', value: 2, unit: 'szt.', category: 'Sprzęt' },
  { name: 'Głośnik', mode: 'fixed', value: 1, unit: 'szt.', category: 'Sprzęt' },
  { name: 'Mikrofon', mode: 'fixed', value: 2, unit: 'szt.', category: 'Sprzęt' },
  { name: 'Przedłużacz', mode: 'fixed', value: 3, unit: 'szt.', category: 'Sprzęt' },
  { name: 'Apteczka', mode: 'fixed', value: 1, unit: 'szt.', category: 'Sprzęt' }
];

// Dla danej liczby uczestników wylicza sztuki każdej pozycji listy pakowania.
function computePackingQuantity(item, participants) {
  const people = Math.max(0, Number(participants) || 0);
  const roundUpTo = Math.max(1, Number(item.roundUpTo) || 1);
  if (item.mode === 'fixed') {
    return Math.max(0, Math.round(Number(item.fixed) || 0));
  }
  const raw = people * (Number(item.perPerson) || 0);
  const rounded = Math.ceil(raw);
  // Zaokrąglenie w górę do pełnej paczki (np. zgrzewki wody po 6).
  return Math.ceil(rounded / roundUpTo) * roundUpTo;
}

// Jednorazowy (per proces) seed startowej listy pakowania, gdy kolekcja pusta.
// Middleware bootujący biegnie po trasach, więc seedujemy leniwie z endpointów.
let packingSeedPromise = null;
function ensurePackingSeed(db) {
  if (!packingSeedPromise) {
    packingSeedPromise = (async () => {
      const count = await db.collection(collections.packingItems).countDocuments({});
      if (count > 0) return;
      const now = new Date();
      await db.collection(collections.packingItems).insertMany(
        DEFAULT_PACKING_ITEMS.map((it, i) => ({
          name: it.name,
          unit: it.unit || 'szt.',
          mode: it.mode,
          perPerson: it.mode === 'per_person' ? it.value : null,
          fixed: it.mode === 'fixed' ? it.value : null,
          roundUpTo: it.roundUpTo || 1,
          category: it.category || 'Materiały',
          sortOrder: i,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }))
      );
    })().catch((err) => { packingSeedPromise = null; throw err; });
  }
  return packingSeedPromise;
}

// Normalizacja pozycji listy pakowania z body (create/update).
function normalizePackingBody(body) {
  const mode = body?.mode === 'fixed' ? 'fixed' : 'per_person';
  const doc = {
    name: String(body?.name || '').trim(),
    unit: String(body?.unit || 'szt.').trim() || 'szt.',
    mode,
    perPerson: mode === 'per_person' ? Math.max(0, Number(body?.perPerson) || 0) : null,
    fixed: mode === 'fixed' ? Math.max(0, Math.round(Number(body?.fixed) || 0)) : null,
    roundUpTo: Math.max(1, Math.round(Number(body?.roundUpTo) || 1)),
    category: String(body?.category || 'Materiały').trim() || 'Materiały',
    // Opcjonalny link do produktu Magazynu (itemCode). Tylko pozycje z linkiem
    // ruszają stan magazynowy przy pakowaniu/powrocie.
    itemCode: body?.itemCode ? normalizeItemCode(body.itemCode) : null
  };
  return doc;
}

// Lokalizacje magazynowe do ruchów pakowania: WH/Stock (źródło) i VIRT/Customers
// (wydania „na wyjazd"). Zwraca { stockId, tripId } albo null gdy brak drzewa.
async function tripStockLocations(db) {
  const [stock, trip] = await Promise.all([
    db.collection(collections.locations).findOne({ code: 'WH/Stock' }, { projection: { _id: 1 } }),
    db.collection(collections.locations).findOne({ code: 'VIRT/Customers' }, { projection: { _id: 1 } })
  ]);
  if (!stock || !trip) return null;
  return { stockId: String(stock._id), tripId: String(trip._id) };
}

// Ruch stanu dla pakowania/powrotu: 'out' = Magazyn→wydania (odjęcie stanu),
// 'in' = wydania→Magazyn (zwrot na stan). Aktualizuje quanty i cache items.quantity.
async function moveTripStock(db, { itemCode, qty, direction, actorEmail, note }) {
  const quantity = Math.max(0, Number(qty) || 0);
  if (!itemCode || quantity <= 0) return;
  const locs = await tripStockLocations(db);
  if (!locs) return; // brak drzewa lokalizacji — pomijamy ruch, checklist działa dalej
  const out = direction === 'out';
  await applyMove(db, {
    itemCode,
    fromLocationId: out ? locs.stockId : locs.tripId,
    toLocationId: out ? locs.tripId : locs.stockId,
    quantity,
    kind: out ? 'delivery' : 'receipt',
    actorEmail: actorEmail || null,
    note: note || ''
  });
  await refreshItemCache(db, itemCode);
}

export function registerTurboWeekendRoutes(app) {
  app.get('/tw', requireAuth, async (_req, res) => {
    const db = await getDb();
    const list = await db.collection(collections.turboWeekends)
      .find({ isActive: { $ne: false } })
      .sort({ eventDate: 1, city: 1 })
      .toArray();
    res.json(list);
  });

  // Wyliczenie listy pakowania dla konkretnego TW (wg liczby uczestników).
  app.get('/tw/:id/packing', requireAuth, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Zły identyfikator' }); }

    const tw = await db.collection(collections.turboWeekends).findOne({ _id: id });
    if (!tw) return res.status(404).json({ message: 'Nie znaleziono Turbo Weekendu' });

    await ensurePackingSeed(db);
    const participants = Math.max(0, Number(tw.participants) || 0);
    const items = await db.collection(collections.packingItems)
      .find({ isActive: { $ne: false } })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    // Stan spakowania/powrotu tego wyjazdu + stan magazynu produktów z linkiem.
    const progressDocs = await db.collection(collections.packingProgress)
      .find({ turboWeekendId: String(id) })
      .toArray();
    const progressByItem = new Map(progressDocs.map(p => [String(p.packingItemId), p]));

    const linkedCodes = [...new Set(items.map(it => it.itemCode).filter(Boolean))];
    const stockByCode = new Map();
    if (linkedCodes.length) {
      const prods = await db.collection(collections.items)
        .find({ itemCode: { $in: linkedCodes } }, { projection: { itemCode: 1, quantity: 1, name: 1 } })
        .toArray();
      for (const p of prods) stockByCode.set(p.itemCode, { quantity: Number(p.quantity) || 0, name: p.name });
    }

    const packing = items.map(it => {
      const needed = computePackingQuantity(it, participants);
      const prog = progressByItem.get(String(it._id));
      const packedQty = prog ? Number(prog.packedQty) || 0 : 0;
      const returnedQty = prog ? Number(prog.returnedQty) || 0 : 0;
      const status = packedQty <= 0 ? 'todo' : (returnedQty > 0 ? 'returned' : 'packed');
      const stock = it.itemCode ? stockByCode.get(it.itemCode) : null;
      return {
        _id: it._id,
        name: it.name,
        unit: it.unit || 'szt.',
        mode: it.mode,
        perPerson: it.perPerson,
        fixed: it.fixed,
        roundUpTo: it.roundUpTo || 1,
        category: it.category || 'Materiały',
        itemCode: it.itemCode || null,
        stockOnHand: stock ? stock.quantity : null,
        quantity: needed,
        packedQty,
        returnedQty,
        consumedQty: Math.max(0, packedQty - returnedQty),
        status
      };
    });

    res.json({
      turboWeekend: {
        _id: tw._id, eventType: tw.eventType || 'Turbo Weekend', city: tw.city,
        region: tw.region || '', eventDate: tw.eventDate || '',
        participants, bus: tw.bus || '', notes: tw.notes || ''
      },
      participants,
      items: packing
    });
  });

  // Oznacz pozycję jako spakowaną (odejmij stan produktu z linkiem).
  app.post('/tw/:id/packing/:packingItemId/pack', requireAuth, async (req, res) => {
    const db = await getDb();
    let twId, itemId;
    try { twId = new ObjectId(req.params.id); itemId = new ObjectId(req.params.packingItemId); }
    catch { return res.status(400).json({ message: 'Zły identyfikator' }); }

    const tw = await db.collection(collections.turboWeekends).findOne({ _id: twId });
    const item = await db.collection(collections.packingItems).findOne({ _id: itemId });
    if (!tw || !item) return res.status(404).json({ message: 'Nie znaleziono wyjazdu lub pozycji' });

    const needed = computePackingQuantity(item, Math.max(0, Number(tw.participants) || 0));
    const existing = await db.collection(collections.packingProgress)
      .findOne({ turboWeekendId: String(twId), packingItemId: String(itemId) });

    const alreadyPacked = existing ? Number(existing.packedQty) || 0 : 0;
    const delta = needed - alreadyPacked; // zwykle całość; obsługuje też zmianę liczby osób
    const now = new Date();

    if (item.itemCode && delta > 0) {
      await moveTripStock(db, {
        itemCode: item.itemCode, qty: delta, direction: 'out',
        actorEmail: req.user.email, note: `Wyjazd ${tw.city}: spakowano „${item.name}"`
      });
    } else if (item.itemCode && delta < 0) {
      await moveTripStock(db, {
        itemCode: item.itemCode, qty: -delta, direction: 'in',
        actorEmail: req.user.email, note: `Wyjazd ${tw.city}: korekta spakowania „${item.name}"`
      });
    }

    await db.collection(collections.packingProgress).updateOne(
      { turboWeekendId: String(twId), packingItemId: String(itemId) },
      {
        $set: {
          turboWeekendId: String(twId), packingItemId: String(itemId),
          itemCode: item.itemCode || null, name: item.name, unit: item.unit || 'szt.',
          neededQty: needed, packedQty: needed, packedAt: now, packedByEmail: req.user.email,
          returnedQty: existing?.returnedQty || 0, updatedAt: now
        }
      },
      { upsert: true }
    );

    res.json({ message: 'Spakowane', packedQty: needed });
  });

  // Cofnij spakowanie (pomyłka) — oddaj cały spakowany stan z powrotem.
  app.post('/tw/:id/packing/:packingItemId/unpack', requireAuth, async (req, res) => {
    const db = await getDb();
    let twId, itemId;
    try { twId = new ObjectId(req.params.id); itemId = new ObjectId(req.params.packingItemId); }
    catch { return res.status(400).json({ message: 'Zły identyfikator' }); }

    const prog = await db.collection(collections.packingProgress)
      .findOne({ turboWeekendId: String(twId), packingItemId: String(itemId) });
    if (!prog || (Number(prog.packedQty) || 0) <= 0) {
      return res.json({ message: 'Nic do cofnięcia' });
    }

    // Oddaj na stan to, co jeszcze nie wróciło (packed − returned).
    const toReturn = Math.max(0, (Number(prog.packedQty) || 0) - (Number(prog.returnedQty) || 0));
    if (prog.itemCode && toReturn > 0) {
      const tw = await db.collection(collections.turboWeekends).findOne({ _id: twId }, { projection: { city: 1 } });
      await moveTripStock(db, {
        itemCode: prog.itemCode, qty: toReturn, direction: 'in',
        actorEmail: req.user.email, note: `Wyjazd ${tw?.city || ''}: cofnięto spakowanie „${prog.name}"`
      });
    }
    await db.collection(collections.packingProgress).deleteOne({ _id: prog._id });
    res.json({ message: 'Cofnięto spakowanie' });
  });

  // Powrót busa: ile danej pozycji wróciło → przyjęcie na stan. consumed = packed − returned.
  app.post('/tw/:id/packing/:packingItemId/return', requireAuth, async (req, res) => {
    const db = await getDb();
    let twId, itemId;
    try { twId = new ObjectId(req.params.id); itemId = new ObjectId(req.params.packingItemId); }
    catch { return res.status(400).json({ message: 'Zły identyfikator' }); }

    const prog = await db.collection(collections.packingProgress)
      .findOne({ turboWeekendId: String(twId), packingItemId: String(itemId) });
    if (!prog || (Number(prog.packedQty) || 0) <= 0) {
      return res.status(400).json({ message: 'Ta pozycja nie została spakowana' });
    }

    const packed = Number(prog.packedQty) || 0;
    const wantReturned = Math.max(0, Math.round(Number(req.body?.returnedQty) || 0));
    const clamped = Math.min(packed, wantReturned);
    const prevReturned = Number(prog.returnedQty) || 0;
    const delta = clamped - prevReturned; // dodatnie → dodaj na stan, ujemne → zdejmij

    const tw = await db.collection(collections.turboWeekends).findOne({ _id: twId }, { projection: { city: 1 } });
    if (prog.itemCode && delta > 0) {
      await moveTripStock(db, {
        itemCode: prog.itemCode, qty: delta, direction: 'in',
        actorEmail: req.user.email, note: `Wyjazd ${tw?.city || ''}: powrót „${prog.name}" (${clamped} szt.)`
      });
    } else if (prog.itemCode && delta < 0) {
      await moveTripStock(db, {
        itemCode: prog.itemCode, qty: -delta, direction: 'out',
        actorEmail: req.user.email, note: `Wyjazd ${tw?.city || ''}: korekta powrotu „${prog.name}"`
      });
    }

    await db.collection(collections.packingProgress).updateOne(
      { _id: prog._id },
      { $set: { returnedQty: clamped, returnedAt: new Date(), returnedByEmail: req.user.email, updatedAt: new Date() } }
    );
    res.json({ message: 'Zapisano powrót', returnedQty: clamped, consumedQty: Math.max(0, packed - clamped) });
  });

  // Produkty Magazynu do podpięcia pod pozycje listy pakowania (datalist).
  app.get('/packing-products', requireAuth, async (_req, res) => {
    const db = await getDb();
    const prods = await db.collection(collections.items)
      .find(
        { isActive: { $ne: false }, $expr: { $in: [{ $toLower: { $ifNull: ['$category', ''] } }, WAREHOUSE_ONLY_CATEGORIES] } },
        { projection: { itemCode: 1, name: 1, category: 1, quantity: 1 } }
      )
      .sort({ name: 1 })
      .toArray();
    res.json(prods);
  });

  // --- Admin: eventy TW ---
  app.post('/admin/tw', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const { city, region = '', eventDate = '', participants, lat, lng, bus = '', notes = '', eventType = '' } = req.body || {};
    if (!String(city || '').trim()) return res.status(400).json({ message: 'Miasto jest wymagane' });

    const now = new Date();
    const doc = {
      eventType: String(eventType || '').trim() || 'Turbo Weekend',
      city: String(city).trim(),
      region: String(region || '').trim(),
      eventDate: String(eventDate || '').trim(),
      participants: Math.max(0, Math.round(Number(participants) || 0)),
      lat: lat != null && lat !== '' ? Number(lat) : null,
      lng: lng != null && lng !== '' ? Number(lng) : null,
      bus: String(bus || '').trim(),
      notes: String(notes || '').trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    const result = await db.collection(collections.turboWeekends).insertOne(doc);
    res.status(201).json({ _id: result.insertedId, ...doc });
  });

  app.patch('/admin/tw/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Zły identyfikator' }); }

    const b = req.body || {};
    const update = { updatedAt: new Date() };
    if (b.eventType !== undefined) update.eventType = String(b.eventType || '').trim() || 'Turbo Weekend';
    if (b.city !== undefined) update.city = String(b.city || '').trim();
    if (b.region !== undefined) update.region = String(b.region || '').trim();
    if (b.eventDate !== undefined) update.eventDate = String(b.eventDate || '').trim();
    if (b.participants !== undefined) update.participants = Math.max(0, Math.round(Number(b.participants) || 0));
    if (b.lat !== undefined) update.lat = b.lat === '' || b.lat == null ? null : Number(b.lat);
    if (b.lng !== undefined) update.lng = b.lng === '' || b.lng == null ? null : Number(b.lng);
    if (b.bus !== undefined) update.bus = String(b.bus || '').trim();
    if (b.notes !== undefined) update.notes = String(b.notes || '').trim();

    const result = await db.collection(collections.turboWeekends).findOneAndUpdate(
      { _id: id }, { $set: update }, { returnDocument: 'after' }
    );
    const doc = result?.value || result;
    if (!doc) return res.status(404).json({ message: 'Nie znaleziono Turbo Weekendu' });
    res.json(doc);
  });

  app.delete('/admin/tw/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Zły identyfikator' }); }
    await db.collection(collections.turboWeekends).deleteOne({ _id: id });
    res.json({ message: 'Usunięto' });
  });

  // --- Lista pakowania ---
  app.get('/packing-items', requireAuth, async (_req, res) => {
    const db = await getDb();
    await ensurePackingSeed(db);
    const items = await db.collection(collections.packingItems)
      .find({ isActive: { $ne: false } })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();
    res.json(items);
  });

  app.post('/admin/packing-items', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    const doc = normalizePackingBody(req.body);
    if (!doc.name) return res.status(400).json({ message: 'Nazwa jest wymagana' });

    const now = new Date();
    const last = await db.collection(collections.packingItems).find({}).sort({ sortOrder: -1 }).limit(1).toArray();
    const sortOrder = (last[0]?.sortOrder ?? -1) + 1;

    const result = await db.collection(collections.packingItems).insertOne({
      ...doc, sortOrder, isActive: true, createdAt: now, updatedAt: now
    });
    res.status(201).json({ _id: result.insertedId, ...doc, sortOrder });
  });

  app.patch('/admin/packing-items/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Zły identyfikator' }); }

    const doc = normalizePackingBody(req.body);
    if (!doc.name) return res.status(400).json({ message: 'Nazwa jest wymagana' });

    const result = await db.collection(collections.packingItems).findOneAndUpdate(
      { _id: id }, { $set: { ...doc, updatedAt: new Date() } }, { returnDocument: 'after' }
    );
    const updated = result?.value || result;
    if (!updated) return res.status(404).json({ message: 'Nie znaleziono pozycji' });
    res.json(updated);
  });

  app.delete('/admin/packing-items/:id', requireAuth, requireAdmin, async (req, res) => {
    const db = await getDb();
    let id;
    try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Zły identyfikator' }); }
    await db.collection(collections.packingItems).deleteOne({ _id: id });
    res.json({ message: 'Usunięto' });
  });
}
