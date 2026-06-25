import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { ObjectId } from 'mongodb';

import { getDb, connectToDatabase } from './db.js';
import { collections, ensureIndexes } from './schema.js';
import { setupPassport, requireAuth, requireAdmin, requireManager, requireWarehouseRead } from './auth.js';
import { LOCATION_KINDS, OPERATION_TYPES, validateOperation, reverseOperation, nextReference, isOperationType, computeReplenishment, isReorderScope, isProtectedLocation, slugifyLocationCode, cascadeItemCodeRename, computeValuation, summarizeMovesByKind } from './stock.js';
import { MANAGER_MAP } from './manager-map.js';

const app = express();
const port = Number(process.env.PORT || 3000);

// Akceptujemy oba warianty nazw (jak skrypty import/backfill), bo lokalny .env
// używa MONGODB_URI / DB_NAME, a środowisko produkcyjne MONGO_URI / MONGO_DB_NAME.
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'equipment_db';

// najpierw łączymy się z bazą, potem konfigurujemy Passport
await connectToDatabase();
setupPassport();

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('ENV CHECK', {
  hasMongoUri: Boolean(MONGO_URI),
  hasSessionSecret: Boolean(process.env.SESSION_SECRET),
  mongoDbName: MONGO_DB_NAME,
  nodeEnv: process.env.NODE_ENV
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      dbName: MONGO_DB_NAME,
      collectionName: 'sessions'
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('public'));

// Escape znaków specjalnych regexu — do bezpiecznego dopasowania tekstu z usera.
function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeItemCode(value) {
  return String(value || '').trim().toUpperCase();
}

function parseBoolean(value) {
  return (
    value === true ||
    value === 'true' ||
    value === '1' ||
    value === 1
  );
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(tag => String(tag).trim()).filter(Boolean);
  }

  return String(tags || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

// Partie cenowe produktu (Magazyn): jeden produkt kupiony w kilku transzach po
// różnych cenach. Każda partia = { qty, unitPrice (cena zakupu), note, addedAt }.
// Łączna ilość produktu = suma `qty` partii. Puste wiersze są odrzucane.
function normalizePriceBatches(batches, now = new Date()) {
  if (!Array.isArray(batches)) return [];
  return batches
    .map(b => ({
      qty: Math.max(0, Math.floor(Number(b?.qty) || 0)),
      unitPrice: Math.max(0, Math.round((Number(b?.unitPrice) || 0) * 100) / 100),
      note: String(b?.note || '').trim(),
      addedAt: b?.addedAt ? new Date(b.addedAt) : now
    }))
    .filter(b => b.qty > 0 || b.unitPrice > 0 || b.note);
}

function isBlockedFromLoan(item) {
  const location = String(item?.currentLocation || '').trim().toLowerCase();
  const isStudioLocation = location === 'studio';
  const isStudioLocked = item?.isStudioLocked === true;

  return isStudioLocation || isStudioLocked;
}

// Słownik stanów technicznych dla list rozwijanych w panelu admina.
const ITEM_CONDITIONS = [
  { value: 'new', label: 'Nowy' },
  { value: 'very_good', label: 'Bardzo dobry' },
  { value: 'good', label: 'Dobry' },
  { value: 'ok', label: 'Zadowalający' },
  { value: 'poor', label: 'Wymaga uwagi' },
  { value: 'damaged', label: 'Uszkodzony' },
  { value: 'for_repair', label: 'Do naprawy' }
];

const FALLBACK_LOCATIONS = ['Magazyn', 'Studio', 'Biuro', 'U pracownika', 'Serwis'];

// Kategorie „nie-elektroniczne" — materiały, które nie są sprzętem do wypożyczania.
// Widok „Dostępny sprzęt" pokazuje TYLKO elektronikę, więc te kategorie są z niego
// wykluczone (pozostają widoczne w module Magazyn, który prezentuje wszystkie kategorie).
// Porównanie jest case-insensitive — trzymamy wartości po małej literze.
const WAREHOUSE_ONLY_CATEGORIES = ['gadżet', 'opakowanie', 'sponsor', 'towar'];

// Moduł „Magazyn" pokazuje DOKŁADNIE te kategorie (nie-elektronikę). Elektronika
// (i pozostałe, np. Roll-up) żyje w widoku „Dostępny sprzęt". Case-insensitive.
const isWarehouseCategory = (category) =>
  WAREHOUSE_ONLY_CATEGORIES.includes(String(category || '').trim().toLowerCase());

// Stan techniczny z importu CSV bywa wpisany "po polsku" albo jako surowa wartość.
// Sprowadzamy do znanej wartości z ITEM_CONDITIONS, w razie wątpliwości fallback.
const CONDITION_VALUES = ITEM_CONDITIONS.map(c => c.value);
const CONDITION_LABEL_TO_VALUE = ITEM_CONDITIONS.reduce((acc, c) => {
  acc[c.label.toLowerCase()] = c.value;
  return acc;
}, {});

function normalizeConditionStatus(value, fallback = 'ok') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (CONDITION_VALUES.includes(lower)) return lower;
  if (CONDITION_LABEL_TO_VALUE[lower]) return CONDITION_LABEL_TO_VALUE[lower];
  return fallback;
}

// Statusy wniosku, które wciąż są "w obiegu" (nie zapadła ostateczna decyzja).
// 'pending' to status zaszłości sprzed wprowadzenia dwuetapowej akceptacji.
const ACTIVE_REQUEST_STATUSES = ['pending_manager', 'pending_admin', 'pending'];

// Typy zgłoszeń pracownika o sprzęcie (zakładka „Mój sprzęt" → administracja).
const ISSUE_TYPES = {
  damage: 'Uszkodzenie',
  lost: 'Zgubienie',
  other: 'Inne'
};

// Wyznacza kierownika-akceptującego dla wnioskodawcy (routing dwuetapowy).
// Zwraca email aktywnego kierownika/admina albo null (wtedy wniosek idzie wprost
// do administracji). Wspólne dla wniosków o wypożyczenie i o zakup.
async function resolveApproverEmail(db, requesterEmail) {
  const requester = await db.collection(collections.users).findOne({ email: requesterEmail });
  let approverEmail = requester?.managerEmail || null;

  if (approverEmail) {
    const approver = await db.collection(collections.users).findOne({
      email: approverEmail,
      isActive: { $ne: false }
    });

    if (!approver || !['manager', 'admin'].includes(approver.role)) {
      approverEmail = null;
    }
  }

  return approverEmail;
}

// Generuje unikalny kod sprzętu dla pozycji dodawanej z wniosku o zakup.
// Prefiks z kategorii (bez polskich znaków), reszta z czasu/losowości.
// Prefiks kodu z kategorii (bez polskich znaków), np. „Towar"→TOWA, „gadżet"→GADZ.
function itemCodePrefix(category) {
  return String(category || 'ZAK')
    .normalize('NFD')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase() || 'ZAK';
}

async function generatePurchaseItemCode(db, category) {
  const prefix = itemCodePrefix(category);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = attempt === 0
      ? Date.now().toString(36).toUpperCase()
      : `${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
    const candidate = `${prefix}-${suffix}`;
    const exists = await db.collection(collections.items).findOne({ itemCode: candidate });
    if (!exists) return candidate;
  }

  return `ZAK-${Date.now()}`;
}

// Wyznacza nowy kod produktu po zmianie kategorii: podmienia prefiks zachowując
// sufiks (ten sam fizyczny produkt, inna kategoria). Kod bez „-" (legacy/ręczny)
// → generuje świeży kod dla nowej kategorii. Zwraca oldCode, gdy nic nie trzeba
// zmieniać; pilnuje unikalności.
async function regenerateItemCodeForCategory(db, oldCode, newCategory) {
  const code = String(oldCode || '');
  const newPrefix = itemCodePrefix(newCategory);
  const dash = code.indexOf('-');
  let candidate;
  if (dash > 0) {
    if (code.slice(0, dash) === newPrefix) return code; // prefiks już pasuje
    candidate = normalizeItemCode(`${newPrefix}-${code.slice(dash + 1)}`);
  } else {
    candidate = normalizeItemCode(await generatePurchaseItemCode(db, newCategory));
  }
  if (candidate === code) return code;
  const exists = await db.collection(collections.items).findOne({ itemCode: candidate });
  if (exists) candidate = normalizeItemCode(await generatePurchaseItemCode(db, newCategory));
  return candidate;
}

// Kaskadowa zmiana itemCode po kolekcjach żyje w stock.js (cascadeItemCodeRename) —
// czysta operacja na db, jak reszta logiki stanu.

app.get('/', (_req, res) => {
  res.sendFile(new URL('../public/index.html', import.meta.url).pathname);
});

app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login-failed.html'
  }),
  (_req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});

app.get('/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: {
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role
    }
  });
});

app.get('/items/available', requireAuth, async (_req, res) => {
  const db = await getDb();

  const items = await db.collection(collections.items)
    .find(
      {
        isActive: { $ne: false },
        operationalStatus: 'available',
        isStudioLocked: { $ne: true },
        currentLocation: { $ne: 'Studio' },
        // „Dostępny sprzęt" = tylko elektronika. Wykluczamy kategorie magazynowe
        // (gadżet/opakowanie/sponsor/towar) niezależnie od wielkości liter.
        $expr: {
          $not: [{ $in: [{ $toLower: { $ifNull: ['$category', ''] } }, WAREHOUSE_ONLY_CATEGORIES] }]
        },
        $and: [
          {
            $or: [
              { assignedToEmail: null },
              { assignedToEmail: { $exists: false } },
              { assignedToEmail: '' }
            ]
          },
          {
            $or: [
              { assignedToName: null },
              { assignedToName: { $exists: false } },
              { assignedToName: '' }
            ]
          }
        ]
      },
      {
        projection: {
          itemCode: 1,
          category: 1,
          name: 1,
          details: 1,
          quantity: 1,
          currentLocation: 1,
          conditionStatus: 1,
          imageUrl: 1,
          thumbnailUrl: 1,
          brand: 1,
          model: 1,
          qrCodeValue: 1,
          tags: 1
        }
      }
    )
    .sort({
      category: 1,
      name: 1,
      itemCode: 1
    })
    .toArray();

  res.json(items);
});

// Lista lokalizacji dla list rozwijanych (np. miejsce zwrotu) — dostępna dla
// każdego zalogowanego. Łączy lokalizacje z bazy ze stałą listą zapasową.
app.get('/locations', requireAuth, async (_req, res) => {
  const db = await getDb();

  // Wykluczamy węzły grupujące (view) i wirtualne (korekta/złom/dostawcy/tranzyt) –
  // do list rozwijanych (np. miejsce zwrotu) pasują tylko lokalizacje fizyczne.
  // Stare dokumenty bez pola `kind` przechodzą ($nin obejmuje brak pola).
  const locationDocs = await db.collection(collections.locations)
    .find({
      isActive: { $ne: false },
      kind: { $nin: [LOCATION_KINDS.VIEW, LOCATION_KINDS.INVENTORY, LOCATION_KINDS.SCRAP, LOCATION_KINDS.SUPPLIER, LOCATION_KINDS.TRANSIT] }
    })
    .sort({ name: 1 })
    .toArray();

  const locationNames = locationDocs.map(loc => loc.name).filter(Boolean);

  res.json([...new Set([...locationNames, ...FALLBACK_LOCATIONS])]);
});

// ===== Magazyn „w stylu Odoo" – endpointy odczytu (Faza 1) =====
// Wszystkie pod `requireWarehouseRead` (viewer/manager/admin). Tylko odczyt.

const PHYSICAL_KINDS = [LOCATION_KINDS.INTERNAL, LOCATION_KINDS.EMPLOYEE];
const TREE_KINDS = [LOCATION_KINDS.VIEW, LOCATION_KINDS.INTERNAL, LOCATION_KINDS.EMPLOYEE];

// Ochrona lokalizacji systemowych (isProtectedLocation) i generowanie kodu
// (slugifyLocationCode) żyją w stock.js — przy modelu lokalizacji.

// Drzewo lokalizacji (fizyczne + węzły grupujące) ze stanem na każdej z nich.
app.get('/warehouse/locations', requireAuth, requireWarehouseRead, async (_req, res) => {
  const db = await getDb();

  const locations = await db.collection(collections.locations)
    .find({ isActive: { $ne: false }, kind: { $in: TREE_KINDS } })
    .sort({ code: 1, name: 1 })
    .toArray();

  const onHand = await db.collection(collections.quants).aggregate([
    { $group: { _id: '$locationId', qty: { $sum: '$quantity' }, lines: { $sum: 1 } } }
  ]).toArray();
  const byLoc = new Map(onHand.map(r => [r._id, r]));

  res.json(locations.map(l => {
    const agg = byLoc.get(String(l._id));
    return {
      id: String(l._id),
      code: l.code || null,
      name: l.name,
      kind: l.kind || null,
      parentId: l.parentId || null,
      depth: Array.isArray(l.ancestors) ? l.ancestors.length : 0,
      onHand: agg?.qty || 0,
      lines: agg?.lines || 0,
      // editable=true tylko dla własnych fizycznych — standardowe/wirtualne są chronione.
      editable: !isProtectedLocation(l)
    };
  }));
});

// ----- Lokalizacje: CRUD własnych fizycznych (jak dostawcy/miejsca dostaw).
// Standardowe (kody z STANDARD_LOCATIONS) i wirtualne są chronione: logika stanu
// trzyma się ich kodów. Nazwa fizycznej lokalizacji żyje też w items.currentLocation
// jako tekst, więc zmiana nazwy kaskaduje na sprzęt. -----
app.post('/warehouse/locations', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const col = db.collection(collections.locations);

  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Podaj nazwę lokalizacji' });
  const kind = req.body.kind === LOCATION_KINDS.EMPLOYEE ? LOCATION_KINDS.EMPLOYEE : LOCATION_KINDS.INTERNAL;

  const dupName = await col.findOne({ name });
  if (dupName) return res.status(409).json({ message: 'Lokalizacja o tej nazwie już istnieje' });

  // Rodzic: domyślnie węzeł „WH" (Magazyn główny). Akceptuje id albo kod; musi być
  // węzłem drzewa fizycznego (view/internal/employee), nie wirtualnym.
  const parentRef = req.body.parentId ? String(req.body.parentId) : 'WH';
  let parent = null;
  try { parent = await col.findOne({ _id: new ObjectId(parentRef) }); } catch { /* nie ObjectId */ }
  if (!parent) parent = await col.findOne({ code: parentRef });
  if (!parent) parent = await col.findOne({ code: 'WH' });
  if (parent && !TREE_KINDS.includes(parent.kind)) {
    return res.status(400).json({ message: 'Nieprawidłowy rodzic lokalizacji' });
  }

  const ancestors = parent ? [...(parent.ancestors || []), parent.code].filter(Boolean) : [];
  const base = parent?.code ? `${parent.code}/${slugifyLocationCode(name)}` : slugifyLocationCode(name);
  let code = base;
  for (let n = 2; await col.findOne({ code }); n += 1) code = `${base}${n}`;

  const now = new Date();
  const doc = {
    code, name, kind,
    parentId: parent ? String(parent._id) : null,
    ancestors, isActive: true, createdAt: now, updatedAt: now
  };
  const { insertedId } = await col.insertOne(doc);
  res.status(201).json({ id: String(insertedId), code, name, kind, parentId: doc.parentId });
});

app.patch('/warehouse/locations/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const col = db.collection(collections.locations);
  let id;
  try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }

  const loc = await col.findOne({ _id: id });
  if (!loc) return res.status(404).json({ message: 'Lokalizacja nie istnieje' });
  if (isProtectedLocation(loc)) return res.status(403).json({ message: 'Lokalizacja systemowa — nie można jej edytować' });

  const update = { updatedAt: new Date() };
  const oldName = loc.name;
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Nazwa nie może być pusta' });
    const dup = await col.findOne({ _id: { $ne: id }, name });
    if (dup) return res.status(409).json({ message: 'Lokalizacja o tej nazwie już istnieje' });
    update.name = name;
  }
  if (req.body.kind !== undefined) {
    update.kind = req.body.kind === LOCATION_KINDS.EMPLOYEE ? LOCATION_KINDS.EMPLOYEE : LOCATION_KINDS.INTERNAL;
  }

  await col.updateOne({ _id: id }, { $set: update });

  // Zmiana nazwy → przenieś ją na sprzęt (items.currentLocation trzyma nazwę tekstowo).
  if (update.name && update.name !== oldName) {
    await db.collection(collections.items).updateMany(
      { currentLocation: oldName },
      { $set: { currentLocation: update.name, updatedAt: new Date() } }
    );
  }
  res.json({ message: 'Zapisano' });
});

app.delete('/warehouse/locations/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const col = db.collection(collections.locations);
  let id;
  try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }

  const loc = await col.findOne({ _id: id });
  if (!loc) return res.status(404).json({ message: 'Lokalizacja nie istnieje' });
  if (isProtectedLocation(loc)) return res.status(403).json({ message: 'Lokalizacja systemowa — nie można jej usunąć' });

  // Nie usuwamy lokalizacji ze stanem (osierocone quanty) ani z podlokalizacjami.
  const onHand = await db.collection(collections.quants).aggregate([
    { $match: { locationId: String(id) } },
    { $group: { _id: null, qty: { $sum: '$quantity' } } }
  ]).toArray();
  if (onHand[0] && onHand[0].qty !== 0) {
    return res.status(409).json({ message: 'Nie można usunąć — lokalizacja ma stan. Najpierw przenieś sprzęt.' });
  }
  const child = await col.findOne({ parentId: String(id), isActive: { $ne: false } });
  if (child) return res.status(409).json({ message: 'Nie można usunąć — lokalizacja ma podlokalizacje.' });

  await col.updateOne({ _id: id }, { $set: { isActive: false, updatedAt: new Date() } });
  res.json({ message: 'Usunięto' });
});

// Stan magazynowy: pozycje na lokalizacjach fizycznych, z danymi sprzętu.
// Opcjonalne filtry: ?location=<id|code|name>&q=<szukaj>.
app.get('/warehouse/stock', requireAuth, requireWarehouseRead, async (req, res) => {
  const db = await getDb();

  const physical = await db.collection(collections.locations)
    .find({ isActive: { $ne: false }, kind: { $in: PHYSICAL_KINDS } })
    .toArray();
  const locById = new Map(physical.map(l => [String(l._id), l]));

  // Filtr lokalizacji po id / code / name.
  const locFilter = String(req.query.location || '').trim();
  let allowedLocIds = physical.map(l => String(l._id));
  if (locFilter) {
    const match = physical.find(l =>
      String(l._id) === locFilter || l.code === locFilter || l.name === locFilter);
    allowedLocIds = match ? [String(match._id)] : [];
  }

  const quants = allowedLocIds.length
    ? await db.collection(collections.quants)
        .find({ locationId: { $in: allowedLocIds }, quantity: { $gt: 0 } })
        .toArray()
    : [];

  const itemCodes = [...new Set(quants.map(q => q.itemCode))];
  const items = itemCodes.length
    ? await db.collection(collections.items)
        .find({ itemCode: { $in: itemCodes } },
          { projection: { itemCode: 1, name: 1, category: 1, conditionStatus: 1 } })
        .toArray()
    : [];
  const itemByCode = new Map(items.map(it => [it.itemCode, it]));

  const q = String(req.query.q || '').trim().toLowerCase();
  let rows = quants.map(quant => {
    const it = itemByCode.get(quant.itemCode) || {};
    const loc = locById.get(quant.locationId) || {};
    return {
      itemCode: quant.itemCode,
      name: it.name || '',
      category: it.category || '',
      conditionStatus: it.conditionStatus || '',
      locationId: quant.locationId,
      locationName: loc.name || '',
      locationCode: loc.code || '',
      lot: quant.lot || null,
      quantity: quant.quantity
    };
  });

  // Magazyn = tylko kategorie magazynowe (elektronika nie należy do tego modułu).
  rows = rows.filter(r => isWarehouseCategory(r.category));

  if (q) {
    rows = rows.filter(r =>
      r.itemCode.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q));
  }

  rows.sort((a, b) =>
    a.itemCode.localeCompare(b.itemCode) || a.locationName.localeCompare(b.locationName));

  res.json(rows);
});

// Historia ruchów (rejestr). Opcjonalne: ?itemCode=&limit=.
app.get('/warehouse/moves', requireAuth, requireWarehouseRead, async (req, res) => {
  const db = await getDb();

  const filter = {};
  const itemCode = normalizeItemCode(req.query.itemCode || '');
  if (itemCode) filter.itemCode = itemCode;

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);

  const moves = await db.collection(collections.stockMoves)
    .find(filter)
    .sort({ doneAt: -1, _id: -1 })
    .limit(limit)
    .toArray();

  const locations = await db.collection(collections.locations).find({}).toArray();
  const locById = new Map(locations.map(l => [String(l._id), l]));

  const itemCodes = [...new Set(moves.map(m => m.itemCode))];
  const items = itemCodes.length
    ? await db.collection(collections.items)
        .find({ itemCode: { $in: itemCodes } }, { projection: { itemCode: 1, name: 1, category: 1 } })
        .toArray()
    : [];
  const itemByCode = new Map(items.map(it => [it.itemCode, it]));

  // Magazyn = tylko kategorie magazynowe — odfiltrowujemy ruchy elektroniki.
  res.json(moves.filter(m => isWarehouseCategory(itemByCode.get(m.itemCode)?.category)).map(m => {
    const from = m.fromLocationId ? locById.get(m.fromLocationId) : null;
    const to = m.toLocationId ? locById.get(m.toLocationId) : null;
    return {
      id: String(m._id),
      itemCode: m.itemCode,
      itemName: itemByCode.get(m.itemCode)?.name || '',
      fromName: from?.name || null,
      toName: to?.name || null,
      quantity: m.quantity,
      lot: m.lot || null,
      kind: m.kind || 'internal',
      actorEmail: m.actorEmail || null,
      note: m.note || '',
      doneAt: m.doneAt || m.createdAt || null
    };
  }));
});

// Raport ruchów w okresie (Raportowanie): podsumowanie wg rodzaju ruchu w zadanym
// przedziale dat + lista szczegółowa. Filtry: ?from=YYYY-MM-DD&to=YYYY-MM-DD&kind=.
// Domyślnie ostatnie 30 dni. `to` jest włączające (do końca dnia). Tylko ruchy
// kategorii magazynowych. Podsumowanie liczone ze wszystkich ruchów okresu;
// lista szczegółowa przycięta do 1000 najnowszych (flaga `truncated`).
app.get('/warehouse/moves-report', requireAuth, requireWarehouseRead, async (req, res) => {
  const db = await getDb();

  const DAY = 24 * 60 * 60 * 1000;
  const parseDay = (s, endOfDay) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const to = parseDay(req.query.to, true) || new Date();
  const from = parseDay(req.query.from, false) || new Date(to.getTime() - 30 * DAY);

  const filter = { doneAt: { $gte: from, $lte: to } };
  const kind = String(req.query.kind || '').trim();
  if (kind) filter.kind = kind;

  const moves = await db.collection(collections.stockMoves)
    .find(filter)
    .sort({ doneAt: -1, _id: -1 })
    .toArray();

  const locations = await db.collection(collections.locations).find({}).toArray();
  const locById = new Map(locations.map(l => [String(l._id), l]));

  const itemCodes = [...new Set(moves.map(m => m.itemCode))];
  const items = itemCodes.length
    ? await db.collection(collections.items)
        .find({ itemCode: { $in: itemCodes } }, { projection: { itemCode: 1, name: 1, category: 1 } })
        .toArray()
    : [];
  const itemByCode = new Map(items.map(it => [it.itemCode, it]));

  // Tylko ruchy towarów magazynowych (jak w historii ruchów).
  const warehouseMoves = moves.filter(m => isWarehouseCategory(itemByCode.get(m.itemCode)?.category));

  const summary = summarizeMovesByKind(warehouseMoves);

  const LIMIT = 1000;
  const rows = warehouseMoves.slice(0, LIMIT).map(m => {
    const fromLoc = m.fromLocationId ? locById.get(m.fromLocationId) : null;
    const toLoc = m.toLocationId ? locById.get(m.toLocationId) : null;
    return {
      id: String(m._id),
      itemCode: m.itemCode,
      itemName: itemByCode.get(m.itemCode)?.name || '',
      fromName: fromLoc?.name || null,
      toName: toLoc?.name || null,
      quantity: m.quantity,
      lot: m.lot || null,
      kind: m.kind || 'internal',
      actorEmail: m.actorEmail || null,
      note: m.note || '',
      doneAt: m.doneAt || m.createdAt || null
    };
  });

  res.json({
    from: from.toISOString(),
    to: to.toISOString(),
    ...summary,
    rows,
    truncated: warehouseMoves.length > LIMIT
  });
});

// Kartoteka produktów Magazynu (tylko kategorie magazynowe) z partiami cenowymi.
// Ilość = suma partii; wartość = Σ(ilość × cena zakupu). Zwraca też `id` (_id)
// potrzebne do edycji (PATCH /admin/items/:id) wprost z poziomu Magazynu.
app.get('/warehouse/products', requireAuth, requireWarehouseRead, async (_req, res) => {
  const db = await getDb();
  const all = await db.collection(collections.items)
    .find({ isActive: { $ne: false } },
      { projection: { itemCode: 1, name: 1, category: 1, brand: 1, model: 1, notes: 1, quantity: 1, priceBatches: 1 } })
    .toArray();

  const products = all
    .filter(it => isWarehouseCategory(it.category))
    .map(it => {
      const batches = Array.isArray(it.priceBatches) ? it.priceBatches : [];
      const batchQty = batches.reduce((s, b) => s + (Number(b.qty) || 0), 0);
      const totalValue = batches.reduce((s, b) => s + (Number(b.qty) || 0) * (Number(b.unitPrice) || 0), 0);
      return {
        id: String(it._id),
        itemCode: it.itemCode,
        name: it.name || '',
        category: it.category || '',
        brand: it.brand || '',
        model: it.model || '',
        notes: it.notes || '',
        quantity: batches.length ? batchQty : (Number(it.quantity) || 0),
        batchCount: batches.length,
        totalValue,
        priceBatches: batches
      };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pl'));

  res.json(products);
});

// Wycena stanu (Raportowanie): Σ ilość × cena zakupu wg partii, w rozbiciu na
// kategorie i łącznie. Te same pieniądze co `totalValue` w kartotece Produktów,
// tylko zagregowane. Tylko odczyt (requireWarehouseRead).
app.get('/warehouse/valuation', requireAuth, requireWarehouseRead, async (_req, res) => {
  const db = await getDb();
  const all = await db.collection(collections.items)
    .find({ isActive: { $ne: false } },
      { projection: { itemCode: 1, name: 1, category: 1, quantity: 1, priceBatches: 1 } })
    .toArray();
  const items = all.filter(it => isWarehouseCategory(it.category));
  res.json(computeValuation(items));
});

// Szybkie utworzenie produktu magazynowego (dla „+ Nowy produkt" w przyjęciu).
// Ilość startowa 0 — stan dobudują przyjęcia (partie cenowe). Kategoria musi być
// magazynowa; kod generowany automatycznie.
app.post('/warehouse/products', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const name = String(req.body.name || '').trim();
  const category = String(req.body.category || 'Towar').trim();
  if (!name) return res.status(400).json({ message: 'Podaj nazwę produktu' });
  if (!isWarehouseCategory(category)) return res.status(400).json({ message: 'Kategoria spoza Magazynu' });

  const now = new Date();
  const doc = {
    itemCode: await generatePurchaseItemCode(db, category),
    category,
    name,
    details: '',
    quantity: 0,
    currentLocation: 'Magazyn',
    conditionStatus: 'ok',
    operationalStatus: 'available',
    assignedToName: null,
    assignedToEmail: null,
    notes: String(req.body.notes || '').trim(),
    brand: String(req.body.brand || '').trim(),
    model: String(req.body.model || '').trim(),
    priceBatches: [],
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
  const { insertedId } = await db.collection(collections.items).insertOne(doc);
  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email, actionType: 'item_created', entityType: 'item',
    entityId: String(insertedId), payload: { itemCode: doc.itemCode, source: 'warehouse-receipt' }, createdAt: now
  });
  res.status(201).json({ id: String(insertedId), itemCode: doc.itemCode, name: doc.name, category: doc.category });
});

// ----- Dostawcy (kartoteka kontrahentów dla przyjęć) -----
function supplierView(s) {
  return {
    id: String(s._id),
    name: s.name || '',
    contact: s.contact || '',
    notes: s.notes || '',
    createdAt: s.createdAt || null
  };
}

app.get('/warehouse/suppliers', requireAuth, requireWarehouseRead, async (_req, res) => {
  const db = await getDb();
  const list = await db.collection(collections.suppliers)
    .find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray();
  res.json(list.map(supplierView));
});

app.post('/warehouse/suppliers', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Podaj nazwę dostawcy' });
  const now = new Date();
  const doc = {
    name,
    contact: String(req.body.contact || '').trim(),
    notes: String(req.body.notes || '').trim(),
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
  const { insertedId } = await db.collection(collections.suppliers).insertOne(doc);
  res.status(201).json({ id: String(insertedId), ...supplierView({ ...doc, _id: insertedId }) });
});

app.patch('/warehouse/suppliers/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  let id;
  try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  const update = { updatedAt: new Date() };
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Nazwa nie może być pusta' });
    update.name = name;
  }
  if (req.body.contact !== undefined) update.contact = String(req.body.contact || '').trim();
  if (req.body.notes !== undefined) update.notes = String(req.body.notes || '').trim();
  const r = await db.collection(collections.suppliers).updateOne({ _id: id }, { $set: update });
  if (!r.matchedCount) return res.status(404).json({ message: 'Dostawca nie istnieje' });
  res.json({ message: 'Zapisano' });
});

app.delete('/warehouse/suppliers/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  let id;
  try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  await db.collection(collections.suppliers).updateOne({ _id: id }, { $set: { isActive: false, updatedAt: new Date() } });
  res.json({ message: 'Usunięto' });
});

// ----- Miejsca dostaw (kartoteka odbiorców dla dostaw — analogicznie do dostawców) -----
function destinationView(d) {
  return {
    id: String(d._id),
    name: d.name || '',
    contact: d.contact || '',
    notes: d.notes || '',
    createdAt: d.createdAt || null
  };
}

app.get('/warehouse/delivery-destinations', requireAuth, requireWarehouseRead, async (_req, res) => {
  const db = await getDb();
  const list = await db.collection(collections.deliveryDestinations)
    .find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray();
  res.json(list.map(destinationView));
});

app.post('/warehouse/delivery-destinations', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Podaj nazwę miejsca dostawy' });
  const now = new Date();
  const doc = {
    name,
    contact: String(req.body.contact || '').trim(),
    notes: String(req.body.notes || '').trim(),
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
  const { insertedId } = await db.collection(collections.deliveryDestinations).insertOne(doc);
  res.status(201).json({ id: String(insertedId), ...destinationView({ ...doc, _id: insertedId }) });
});

app.patch('/warehouse/delivery-destinations/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  let id;
  try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  const update = { updatedAt: new Date() };
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Nazwa nie może być pusta' });
    update.name = name;
  }
  if (req.body.contact !== undefined) update.contact = String(req.body.contact || '').trim();
  if (req.body.notes !== undefined) update.notes = String(req.body.notes || '').trim();
  const r = await db.collection(collections.deliveryDestinations).updateOne({ _id: id }, { $set: update });
  if (!r.matchedCount) return res.status(404).json({ message: 'Miejsce dostawy nie istnieje' });
  res.json({ message: 'Zapisano' });
});

app.delete('/warehouse/delivery-destinations/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  let id;
  try { id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  await db.collection(collections.deliveryDestinations).updateOne({ _id: id }, { $set: { isActive: false, updatedAt: new Date() } });
  res.json({ message: 'Usunięto' });
});

// ----- Operacje magazynowe (dokumenty: Przekazy + Korekty) -----

const OPERATION_LOC_KINDS = [
  LOCATION_KINDS.INTERNAL, LOCATION_KINDS.EMPLOYEE,
  LOCATION_KINDS.SUPPLIER, LOCATION_KINDS.SCRAP, LOCATION_KINDS.INVENTORY, LOCATION_KINDS.TRANSIT
];

function normalizeOperationLines(type, rawLines) {
  const lines = Array.isArray(rawLines) ? rawLines : [];
  return lines
    .map(l => {
      const itemCode = normalizeItemCode(l.itemCode || '');
      if (!itemCode) return null;
      if (type === 'adjustment') {
        return {
          itemCode,
          locationId: l.locationId ? String(l.locationId) : null,
          countedQty: Math.max(0, Number(l.countedQty) || 0),
          lot: l.lot ? String(l.lot) : null
        };
      }
      // Konwersja: itemCode = towar (źródło), targetItemCode = gadżet (cel).
      if (type === 'conversion') {
        const targetItemCode = normalizeItemCode(l.targetItemCode || '');
        if (!targetItemCode) return null;
        return { itemCode, targetItemCode, quantity: Math.max(1, Number(l.quantity) || 1) };
      }
      const line = { itemCode, quantity: Math.max(1, Number(l.quantity) || 1), lot: l.lot ? String(l.lot) : null };
      // Przyjęcie: cena zakupu per pozycja (zł). Zatwierdzenie dopisze partię cenową.
      if (type === 'receipt') line.unitPrice = Math.max(0, Math.round((Number(l.unitPrice) || 0) * 100) / 100);
      return line;
    })
    .filter(Boolean);
}

// Rozwiązuje dostawcę po id; zwraca { supplierId, supplierName } (snapshot nazwy
// na dokumencie, by historia była czytelna nawet po usunięciu dostawcy).
async function resolveSupplier(db, supplierId) {
  if (!supplierId) return { supplierId: null, supplierName: '' };
  let doc = null;
  try { doc = await db.collection(collections.suppliers).findOne({ _id: new ObjectId(String(supplierId)) }); }
  catch { return { supplierId: null, supplierName: '' }; }
  return doc ? { supplierId: String(doc._id), supplierName: doc.name || '' } : { supplierId: null, supplierName: '' };
}

// Rozwiązuje miejsce dostawy po id; zwraca { destinationId, destinationName } (snapshot
// nazwy na dokumencie, by historia była czytelna nawet po usunięciu miejsca).
async function resolveDeliveryDestination(db, destinationId) {
  if (!destinationId) return { destinationId: null, destinationName: '' };
  let doc = null;
  try { doc = await db.collection(collections.deliveryDestinations).findOne({ _id: new ObjectId(String(destinationId)) }); }
  catch { return { destinationId: null, destinationName: '' }; }
  return doc ? { destinationId: String(doc._id), destinationName: doc.name || '' } : { destinationId: null, destinationName: '' };
}

// Akceptuje id lokalizacji albo jej kod (np. 'WH/Stock'); zwraca string id albo null.
async function resolveLocationId(db, idOrCode) {
  if (!idOrCode) return null;
  const s = String(idOrCode);
  try {
    const byId = await db.collection(collections.locations).findOne({ _id: new ObjectId(s) });
    if (byId) return String(byId._id);
  } catch { /* nie ObjectId — próbujemy po code */ }
  const byCode = await db.collection(collections.locations).findOne({ code: s });
  return byCode ? String(byCode._id) : null;
}

// Dane do formularza operacji: lokalizacje (z wirtualnymi), sprzęt, definicje typów.
app.get('/warehouse/form-data', requireAuth, requireWarehouseRead, async (_req, res) => {
  const db = await getDb();
  const locations = await db.collection(collections.locations)
    .find({ isActive: { $ne: false }, kind: { $in: OPERATION_LOC_KINDS } })
    .sort({ code: 1 }).toArray();
  const allItems = await db.collection(collections.items)
    .find({ isActive: { $ne: false } }, { projection: { itemCode: 1, name: 1, category: 1 } })
    .sort({ name: 1 }).toArray();
  // Operacje magazynowe dotyczą tylko kategorii magazynowych (nie elektroniki).
  const items = allItems.filter(it => isWarehouseCategory(it.category));
  const suppliers = await db.collection(collections.suppliers)
    .find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray();
  const destinations = await db.collection(collections.deliveryDestinations)
    .find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray();

  // Dostępny stan na Magazynie (WH/Stock) per produkt — do podpowiedzi „dostępne: N"
  // i blokady nadmiaru przy konwersji.
  const stockLoc = await db.collection(collections.locations).findOne({ code: 'WH/Stock' });
  const onHandByCode = new Map();
  if (stockLoc) {
    const quants = await db.collection(collections.quants)
      .find({ locationId: String(stockLoc._id) }, { projection: { itemCode: 1, quantity: 1 } }).toArray();
    for (const q of quants) onHandByCode.set(q.itemCode, Number(q.quantity) || 0);
  }

  res.json({
    locations: locations.map(l => ({ id: String(l._id), code: l.code, name: l.name, kind: l.kind })),
    items: items.map(it => ({ itemCode: it.itemCode, name: it.name || '', category: it.category || '', onHand: onHandByCode.get(it.itemCode) || 0 })),
    suppliers: suppliers.map(s => ({ id: String(s._id), name: s.name || '' })),
    deliveryDestinations: destinations.map(d => ({ id: String(d._id), name: d.name || '' })),
    types: OPERATION_TYPES
  });
});

// Dashboard „Przegląd": liczniki dokumentów per typ i stan.
app.get('/warehouse/overview', requireAuth, requireWarehouseRead, async (_req, res) => {
  const db = await getDb();
  const agg = await db.collection(collections.stockOperations).aggregate([
    { $group: { _id: { type: '$type', state: '$state' }, n: { $sum: 1 } } }
  ]).toArray();
  const counts = {};
  for (const row of agg) {
    const t = row._id.type;
    const s = row._id.state || 'draft';
    counts[t] = counts[t] || { draft: 0, ready: 0, done: 0, cancelled: 0, total: 0 };
    counts[t][s] = (counts[t][s] || 0) + row.n;
    counts[t].total += row.n;
  }
  const types = Object.entries(OPERATION_TYPES).map(([type, cfg]) => ({
    type, label: cfg.label, group: cfg.group,
    ...(counts[type] || { draft: 0, ready: 0, done: 0, cancelled: 0, total: 0 })
  }));

  // Zapotrzebowanie: ile kategorii/pozycji jest poniżej minimum + co konkretnie
  // brakuje (najpilniejsze pierwsze) — by Przegląd pokazał listę, nie samą liczbę.
  const replRows = await computeReplenishment(db);
  const belowRows = replRows
    .filter(r => r.below)
    .sort((a, b) => b.toOrder - a.toOrder || String(a.label).localeCompare(String(b.label), 'pl'))
    .map(r => ({ label: r.label, scope: r.scope, onHand: r.onHand, minQty: r.minQty, toOrder: r.toOrder }));
  const replenishment = {
    rules: replRows.length,
    below: belowRows.length,
    items: belowRows
  };

  res.json({ types, replenishment });
});

// Lista operacji danego typu (z nazwami lokalizacji). Filtr: ?type=&state=.
app.get('/warehouse/operations', requireAuth, requireWarehouseRead, async (req, res) => {
  const db = await getDb();
  const filter = {};
  if (req.query.type && isOperationType(req.query.type)) filter.type = req.query.type;
  if (req.query.state) filter.state = String(req.query.state);

  const ops = await db.collection(collections.stockOperations)
    .find(filter).sort({ createdAt: -1 }).limit(500).toArray();

  const locations = await db.collection(collections.locations).find({}).toArray();
  const locById = new Map(locations.map(l => [String(l._id), l]));

  res.json(ops.map(op => ({
    id: String(op._id),
    reference: op.reference,
    type: op.type,
    typeLabel: OPERATION_TYPES[op.type]?.label || op.type,
    state: op.state,
    fromName: op.fromLocationId ? (locById.get(String(op.fromLocationId))?.name || null) : null,
    toName: op.toLocationId ? (locById.get(String(op.toLocationId))?.name || null) : null,
    contact: op.contact || '',
    supplierId: op.supplierId ? String(op.supplierId) : null,
    supplierName: op.supplierName || '',
    destinationId: op.destinationId ? String(op.destinationId) : null,
    destinationName: op.destinationName || '',
    scheduledAt: op.scheduledAt || null,
    sourceDocument: op.sourceDocument || '',
    lineCount: Array.isArray(op.lines) ? op.lines.length : 0,
    createdAt: op.createdAt || null
  })));
});

// Szczegół operacji z pozycjami.
app.get('/warehouse/operations/:id', requireAuth, requireWarehouseRead, async (req, res) => {
  const db = await getDb();
  let op;
  try { op = await db.collection(collections.stockOperations).findOne({ _id: new ObjectId(req.params.id) }); }
  catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  if (!op) return res.status(404).json({ message: 'Operacja nie istnieje' });

  const locations = await db.collection(collections.locations).find({}).toArray();
  const locById = new Map(locations.map(l => [String(l._id), l]));
  const codes = [...new Set((op.lines || []).flatMap(l => [l.itemCode, l.targetItemCode]).filter(Boolean))];
  const items = codes.length
    ? await db.collection(collections.items).find({ itemCode: { $in: codes } }, { projection: { itemCode: 1, name: 1 } }).toArray()
    : [];
  const nameByCode = new Map(items.map(i => [i.itemCode, i.name]));

  res.json({
    id: String(op._id),
    reference: op.reference,
    type: op.type,
    typeLabel: OPERATION_TYPES[op.type]?.label || op.type,
    state: op.state,
    fromLocationId: op.fromLocationId ? String(op.fromLocationId) : null,
    toLocationId: op.toLocationId ? String(op.toLocationId) : null,
    fromName: op.fromLocationId ? (locById.get(String(op.fromLocationId))?.name || null) : null,
    toName: op.toLocationId ? (locById.get(String(op.toLocationId))?.name || null) : null,
    contact: op.contact || '',
    supplierId: op.supplierId ? String(op.supplierId) : null,
    supplierName: op.supplierName || '',
    destinationId: op.destinationId ? String(op.destinationId) : null,
    destinationName: op.destinationName || '',
    scheduledAt: op.scheduledAt || null,
    sourceDocument: op.sourceDocument || '',
    note: op.note || '',
    lines: (op.lines || []).map(l => ({
      itemCode: l.itemCode,
      itemName: nameByCode.get(l.itemCode) || '',
      targetItemCode: l.targetItemCode || null,
      targetName: l.targetItemCode ? (nameByCode.get(l.targetItemCode) || '') : null,
      quantity: l.quantity ?? null,
      unitPrice: l.unitPrice ?? null,
      countedQty: l.countedQty ?? null,
      locationId: l.locationId ? String(l.locationId) : null,
      lot: l.lot || null
    })),
    doneAt: op.doneAt || null,
    createdAt: op.createdAt || null
  });
});

app.post('/warehouse/operations', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { type } = req.body;
  if (!isOperationType(type)) return res.status(400).json({ message: 'Nieprawidłowy typ operacji' });
  const cfg = OPERATION_TYPES[type];

  const now = new Date();
  const supplier = await resolveSupplier(db, req.body.supplierId);
  const destination = await resolveDeliveryDestination(db, req.body.destinationId);
  const doc = {
    reference: await nextReference(db, cfg.prefix),
    type,
    state: 'draft',
    fromLocationId: await resolveLocationId(db, req.body.fromLocationId || cfg.defaultFrom),
    toLocationId: await resolveLocationId(db, req.body.toLocationId || cfg.defaultTo),
    contact: String(req.body.contact || '').trim(),
    supplierId: supplier.supplierId,
    supplierName: supplier.supplierName,
    destinationId: destination.destinationId,
    destinationName: destination.destinationName,
    scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
    sourceDocument: String(req.body.sourceDocument || '').trim(),
    note: String(req.body.note || '').trim(),
    lines: normalizeOperationLines(type, req.body.lines),
    createdByEmail: req.user.email,
    createdAt: now,
    updatedAt: now
  };
  const { insertedId } = await db.collection(collections.stockOperations).insertOne(doc);
  res.status(201).json({ id: String(insertedId), reference: doc.reference });
});

app.patch('/warehouse/operations/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  let op;
  try { op = await db.collection(collections.stockOperations).findOne({ _id: new ObjectId(req.params.id) }); }
  catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  if (!op) return res.status(404).json({ message: 'Operacja nie istnieje' });
  if (op.state === 'done') return res.status(400).json({ message: 'Wykonanej operacji nie można edytować' });
  if (op.state === 'cancelled') return res.status(400).json({ message: 'Anulowanej operacji nie można edytować' });

  const update = { updatedAt: new Date() };
  if (req.body.fromLocationId !== undefined) update.fromLocationId = await resolveLocationId(db, req.body.fromLocationId);
  if (req.body.toLocationId !== undefined) update.toLocationId = await resolveLocationId(db, req.body.toLocationId);
  if (req.body.contact !== undefined) update.contact = String(req.body.contact || '').trim();
  if (req.body.supplierId !== undefined) {
    const supplier = await resolveSupplier(db, req.body.supplierId);
    update.supplierId = supplier.supplierId;
    update.supplierName = supplier.supplierName;
  }
  if (req.body.destinationId !== undefined) {
    const destination = await resolveDeliveryDestination(db, req.body.destinationId);
    update.destinationId = destination.destinationId;
    update.destinationName = destination.destinationName;
  }
  if (req.body.scheduledAt !== undefined) update.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
  if (req.body.sourceDocument !== undefined) update.sourceDocument = String(req.body.sourceDocument || '').trim();
  if (req.body.note !== undefined) update.note = String(req.body.note || '').trim();
  if (req.body.lines !== undefined) update.lines = normalizeOperationLines(op.type, req.body.lines);
  if (req.body.state === 'ready' || req.body.state === 'draft') update.state = req.body.state;

  await db.collection(collections.stockOperations).updateOne({ _id: op._id }, { $set: update });
  res.json({ message: 'Zapisano' });
});

app.post('/warehouse/operations/:id/validate', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  try {
    const result = await validateOperation(db, req.params.id, req.user.email);
    await db.collection(collections.auditLogs).insertOne({
      actorEmail: req.user.email,
      actionType: 'warehouse_operation_done',
      entityType: 'stockOperation',
      entityId: req.params.id,
      payload: result,
      createdAt: new Date()
    });
    res.json({ message: `Wykonano ${result.reference}`, ...result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Cofnięcie wykonanej operacji → wraca do „roboczej" (do edycji i ponownego
// zatwierdzenia). Odwraca ruchy i — dla przyjęć — partie cenowe.
app.post('/warehouse/operations/:id/reverse', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  try {
    const result = await reverseOperation(db, req.params.id, req.user.email);
    await db.collection(collections.auditLogs).insertOne({
      actorEmail: req.user.email,
      actionType: 'warehouse_operation_reversed',
      entityType: 'stockOperation',
      entityId: req.params.id,
      payload: result,
      createdAt: new Date()
    });
    res.json({ message: `Cofnięto ${result.reference}`, ...result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/warehouse/operations/:id/cancel', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  let op;
  try { op = await db.collection(collections.stockOperations).findOne({ _id: new ObjectId(req.params.id) }); }
  catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  if (!op) return res.status(404).json({ message: 'Operacja nie istnieje' });
  if (op.state === 'done') return res.status(400).json({ message: 'Nie można anulować wykonanej operacji' });
  await db.collection(collections.stockOperations).updateOne({ _id: op._id }, { $set: { state: 'cancelled', updatedAt: new Date() } });
  res.json({ message: 'Anulowano' });
});

// ----- Zapotrzebowanie (reguły min-max / orderpoint) -----

// Lista reguł wzbogacona o bieżący dostępny stan i sugestię „do zamówienia".
app.get('/warehouse/reorder-rules', requireAuth, requireWarehouseRead, async (_req, res) => {
  const db = await getDb();
  res.json(await computeReplenishment(db));
});

app.post('/warehouse/reorder-rules', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const scope = String(req.body.scope || '').trim();
  if (!isReorderScope(scope)) return res.status(400).json({ message: 'Nieprawidłowy poziom reguły' });

  let target = String(req.body.target || '').trim();
  if (!target) return res.status(400).json({ message: scope === 'item' ? 'Wybierz sprzęt' : 'Podaj kategorię' });
  if (scope === 'item') {
    target = normalizeItemCode(target);
    const item = await db.collection(collections.items).findOne({ itemCode: target }, { projection: { _id: 1 } });
    if (!item) return res.status(400).json({ message: `Sprzęt ${target} nie istnieje` });
  }

  const minQty = Math.max(0, Math.floor(Number(req.body.minQty) || 0));
  const maxQty = Math.max(1, Math.floor(Number(req.body.maxQty) || 0));
  if (maxQty < minQty) return res.status(400).json({ message: 'Maksimum nie może być mniejsze niż minimum' });

  const now = new Date();
  const doc = {
    scope, target, minQty, maxQty,
    note: String(req.body.note || '').trim(),
    isActive: true,
    createdByEmail: req.user.email,
    createdAt: now,
    updatedAt: now
  };
  try {
    const { insertedId } = await db.collection(collections.reorderRules).insertOne(doc);
    await db.collection(collections.auditLogs).insertOne({
      actorEmail: req.user.email,
      actionType: 'reorder_rule_created',
      entityType: 'reorderRule',
      entityId: String(insertedId),
      payload: { scope, target, minQty, maxQty },
      createdAt: now
    });
    res.status(201).json({ id: String(insertedId) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Reguła dla tego celu już istnieje' });
    console.error('reorder-rules POST', err);
    res.status(500).json({ message: 'Nie udało się zapisać reguły' });
  }
});

app.patch('/warehouse/reorder-rules/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  let rule;
  try { rule = await db.collection(collections.reorderRules).findOne({ _id: new ObjectId(req.params.id) }); }
  catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  if (!rule) return res.status(404).json({ message: 'Reguła nie istnieje' });

  const update = { updatedAt: new Date() };
  if (req.body.minQty !== undefined) update.minQty = Math.max(0, Math.floor(Number(req.body.minQty) || 0));
  if (req.body.maxQty !== undefined) update.maxQty = Math.max(1, Math.floor(Number(req.body.maxQty) || 0));
  if (req.body.note !== undefined) update.note = String(req.body.note || '').trim();
  if (req.body.isActive !== undefined) update.isActive = !!req.body.isActive;

  const minQty = update.minQty ?? rule.minQty;
  const maxQty = update.maxQty ?? rule.maxQty;
  if (maxQty < minQty) return res.status(400).json({ message: 'Maksimum nie może być mniejsze niż minimum' });

  await db.collection(collections.reorderRules).updateOne({ _id: rule._id }, { $set: update });
  res.json({ message: 'Zapisano' });
});

app.delete('/warehouse/reorder-rules/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  let id;
  try { id = new ObjectId(req.params.id); }
  catch { return res.status(400).json({ message: 'Niepoprawny identyfikator' }); }
  const result = await db.collection(collections.reorderRules).deleteOne({ _id: id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Reguła nie istnieje' });
  res.json({ message: 'Usunięto regułę' });
});

// Lista aktywnych użytkowników (tylko imię/e-mail) — do wyboru osoby przy
// transferze pracownik→pracownik. Dostępne dla każdego zalogowanego.
app.get('/users', requireAuth, async (_req, res) => {
  const db = await getDb();
  const users = await db.collection(collections.users)
    .find({ isActive: { $ne: false } }, { projection: { email: 1, fullName: 1 } })
    .sort({ fullName: 1 })
    .toArray();

  res.json(users.map(u => ({ email: u.email, fullName: u.fullName || u.email })));
});

app.get('/items/:itemCode', requireAuth, async (req, res) => {
  const db = await getDb();
  const normalizedItemCode = normalizeItemCode(req.params.itemCode);

  const item = await db.collection(collections.items).findOne(
    {
      itemCode: normalizedItemCode,
      isActive: { $ne: false }
    },
    {
      projection: {
        itemCode: 1,
        category: 1,
        name: 1,
        details: 1,
        quantity: 1,
        currentLocation: 1,
        conditionStatus: 1,
        operationalStatus: 1,
        imageUrl: 1,
        thumbnailUrl: 1,
        brand: 1,
        model: 1,
        qrCodeValue: 1,
        tags: 1,
        serialNumber: 1,
        warrantyUntil: 1,
        detailedLocation: 1,
        isStudioLocked: 1,
        assignedToEmail: 1,
        assignedToName: 1,
        notes: 1,
        createdAt: 1,
        updatedAt: 1
      }
    }
  );

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  const activeLoan = await db.collection(collections.loans).findOne(
    {
      itemCode: normalizedItemCode,
      status: 'active'
    },
    {
      sort: { borrowedAt: -1 }
    }
  );

  res.json({
    ...item,
    activeLoan: activeLoan || null
  });
});

app.get('/my/loans', requireAuth, async (req, res) => {
  const db = await getDb();

  const loans = await db.collection(collections.loans)
    .find({ userEmail: req.user.email, status: 'active' })
    .sort({ borrowedAt: -1 })
    .toArray();

  res.json(loans);
});

// Sprzęt, który użytkownik faktycznie ma u siebie — źródłem prawdy jest
// dokument sprzętu (assignedToEmail), nie kolekcja loans. Dzięki temu widać też
// sprzęt przypisany z importu Excela, dla którego nie powstał rekord wypożyczenia.
app.get('/my/items', requireAuth, async (req, res) => {
  const db = await getDb();

  const items = await db.collection(collections.items)
    .find(
      {
        assignedToEmail: req.user.email,
        isActive: { $ne: false }
      },
      {
        projection: {
          itemCode: 1,
          name: 1,
          category: 1,
          currentLocation: 1,
          conditionStatus: 1,
          assignedToName: 1,
          assignedToEmail: 1
        }
      }
    )
    .sort({ category: 1, name: 1, itemCode: 1 })
    .toArray();

  res.json(items);
});

// Zwrot sprzętu po itemCode (działa też bez rekordu wypożyczenia).
app.post('/items/:itemCode/return', requireAuth, async (req, res) => {
  const db = await getDb();
  const { returnLocation = 'Magazyn', returnNote = '' } = req.body;
  const itemCode = normalizeItemCode(req.params.itemCode);

  const item = await db.collection(collections.items).findOne({
    itemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  const isOwner = item.assignedToEmail === req.user.email;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Nie możesz oddać cudzego sprzętu' });
  }

  if (!item.assignedToEmail && item.operationalStatus === 'available') {
    return res.status(400).json({ message: 'Ten sprzęt nie jest u nikogo wypożyczony' });
  }

  const now = new Date();
  const loc = String(returnLocation || 'Magazyn').trim() || 'Magazyn';

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        operationalStatus: 'available',
        currentLocation: loc,
        assignedToEmail: null,
        assignedToName: null,
        updatedAt: now
      }
    }
  );

  // Zamknij aktywne wypożyczenie, jeśli takie istnieje (dla zwykłego obiegu).
  await db.collection(collections.loans).updateMany(
    { itemCode, status: 'active' },
    {
      $set: {
        status: 'returned',
        returnedAt: now,
        returnLocation: loc,
        returnNote: String(returnNote || '').trim(),
        closedByEmail: req.user.email
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_returned',
    entityType: 'item',
    entityId: itemCode,
    payload: { itemCode, returnLocation: loc },
    createdAt: now
  });

  res.json({ message: 'Returned' });
});

// Zgłoszenie pracownika dotyczące jego sprzętu (np. uszkodzenie/zgubienie).
// Trafia do administracji jako powiadomienie (zakładka „Zgłoszenia").
app.post('/my/items/:itemCode/report-issue', requireAuth, async (req, res) => {
  const db = await getDb();
  const itemCode = normalizeItemCode(req.params.itemCode);
  const rawType = String(req.body?.issueType || '').trim().toLowerCase();
  const issueType = ISSUE_TYPES[rawType] ? rawType : 'other';
  const message = String(req.body?.message || '').trim();

  if (!message) {
    return res.status(400).json({ message: 'Opisz, co się dzieje ze sprzętem' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ message: 'Opis jest za długi (max 2000 znaków)' });
  }

  const item = await db.collection(collections.items).findOne({
    itemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  // Zgłaszać może osoba, która ma sprzęt przypisany, albo administracja.
  const isAssignee = item.assignedToEmail === req.user.email;
  if (!isAssignee && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Możesz zgłaszać tylko swój sprzęt' });
  }

  const now = new Date();
  const notification = {
    kind: 'issue',
    status: 'open',
    issueType,
    itemCode: item.itemCode,
    itemName: item.name,
    message,
    createdAt: now,
    createdByEmail: req.user.email,
    createdByName: req.user.fullName || req.user.email,
    resolvedAt: null,
    resolvedByEmail: null
  };

  const result = await db.collection(collections.notifications).insertOne(notification);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'issue_reported',
    entityType: 'item',
    entityId: String(item._id),
    payload: { itemCode: item.itemCode, itemName: item.name, reason: ISSUE_TYPES[issueType] },
    createdAt: now
  });

  res.status(201).json({ message: 'Zgłoszenie wysłane do administracji', id: result.insertedId });
});

// Transfer sprzętu inicjowany przez pracownika — wymiana między pracownikami.
// Przenosić można tylko własny sprzęt; administracja widzi to w „Zgłoszeniach".
app.post('/my/items/:itemCode/transfer', requireAuth, async (req, res) => {
  const db = await getDb();
  const itemCode = normalizeItemCode(req.params.itemCode);
  const { toEmail = '', note = '' } = req.body;
  const targetEmail = String(toEmail || '').trim().toLowerCase();

  if (!targetEmail) {
    return res.status(400).json({ message: 'Wskaż osobę, na którą przenosisz sprzęt' });
  }

  const item = await db.collection(collections.items).findOne({
    itemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  // Przenosić może osoba, która ma sprzęt przypisany, albo administracja.
  const isAssignee = item.assignedToEmail === req.user.email;
  if (!isAssignee && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Możesz przenosić tylko swój sprzęt' });
  }

  if (isBlockedFromLoan(item)) {
    return res.status(400).json({ message: 'Tego sprzętu nie można przenosić' });
  }

  if (item.assignedToEmail === targetEmail) {
    return res.status(400).json({ message: 'Sprzęt jest już przypisany do tej osoby' });
  }

  const targetUser = await db.collection(collections.users).findOne({
    email: targetEmail,
    isActive: { $ne: false }
  });

  if (!targetUser) {
    return res.status(404).json({ message: 'Nie znaleziono aktywnego użytkownika o tym adresie' });
  }

  const { targetName } = await performItemTransfer(db, item, targetUser, req.user, note);
  res.json({ message: `Przeniesiono na ${targetName}`, itemCode: item.itemCode });
});

app.get('/my/loan-requests', requireAuth, async (req, res) => {
  const db = await getDb();

  const requests = await db.collection(collections.loanRequests)
    .find({ requesterEmail: req.user.email })
    .sort({ requestedAt: -1 })
    .toArray();

  res.json(requests);
});

// Wnioski wymagające działania zalogowanego użytkownika — zasila zakładkę
// „Wymagane działania" oraz licznik (badge) w menu.
//  - kierownik: wnioski przypisane do niego, czekające na jego decyzję,
//  - admin: dodatkowo wszystkie wnioski czekające na realizację administracji.
app.get('/my/action-items', requireAuth, async (req, res) => {
  const db = await getDb();
  const me = req.user.email;

  const conditions = [
    { status: 'pending_manager', approverEmail: me }
  ];

  if (req.user.role === 'admin') {
    conditions.push({ status: { $in: ['pending_admin', 'pending'] } });
    // Zakupy w toku procedury (po zatwierdzeniu) też wymagają działania admina.
    conditions.push({ kind: 'purchase', status: { $in: ['to_order', 'ordered'] } });
  }

  const requests = await db.collection(collections.loanRequests)
    .find({ $or: conditions })
    .sort({ requestedAt: -1 })
    .toArray();

  res.json(requests);
});

app.post('/loan-requests', requireAuth, async (req, res) => {
  const db = await getDb();

  const {
    itemCode,
    purpose = '',
    targetUseLocation = 'Dom',
    requestedReturnDate = null,
    note = ''
  } = req.body;

  if (!itemCode) {
    return res.status(400).json({ message: 'itemCode jest wymagane' });
  }

  if (!requestedReturnDate) {
    return res.status(400).json({ message: 'Planowana data zwrotu jest wymagana' });
  }

  const normalizedItemCode = normalizeItemCode(itemCode);

  const item = await db.collection(collections.items).findOne({
    itemCode: normalizedItemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  if (isBlockedFromLoan(item)) {
    return res.status(400).json({
      message: 'Tego sprzętu nie można wypożyczyć'
    });
  }

  if (item.operationalStatus !== 'available') {
    return res.status(400).json({ message: 'Sprzęt nie jest dostępny' });
  }

  const existingPendingRequest = await db.collection(collections.loanRequests).findOne({
    itemCode: normalizedItemCode,
    requesterEmail: req.user.email,
    status: { $in: ACTIVE_REQUEST_STATUSES }
  });

  if (existingPendingRequest) {
    return res.status(409).json({
      message: 'Masz już oczekujący wniosek dla tego sprzętu'
    });
  }

  // Dwuetapowy obieg: jeśli wnioskodawca ma przypisanego (aktywnego) kierownika,
  // wniosek trafia najpierw do niego (pending_manager), inaczej wprost do admina.
  const approverEmail = await resolveApproverEmail(db, req.user.email);

  const loanRequest = {
    kind: 'loan',
    itemCode: item.itemCode,
    itemName: item.name,
    requesterEmail: req.user.email,
    requesterName: req.user.fullName || req.user.email,
    purpose: String(purpose || '').trim(),
    targetUseLocation: String(targetUseLocation || '').trim(),
    requestedReturnDate: requestedReturnDate || null,
    note: String(note || '').trim(),
    approverEmail,
    status: approverEmail ? 'pending_manager' : 'pending_admin',
    requestedAt: new Date(),
    managerApprovedAt: null,
    managerApprovedByEmail: null,
    approvedAt: null,
    approvedByEmail: null,
    rejectedAt: null,
    rejectedByEmail: null,
    decisionNote: null
  };

  const result = await db.collection(collections.loanRequests).insertOne(loanRequest);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_created',
    entityType: 'loan_request',
    entityId: String(result.insertedId),
    payload: {
      itemCode: item.itemCode,
      requesterEmail: req.user.email
    },
    createdAt: new Date()
  });

  res.status(201).json({
    message: 'Wniosek o wypożyczenie został utworzony',
    requestId: result.insertedId
  });
});

// Wniosek o ZAKUP sprzętu spoza magazynu/bazy (np. promocja w sklepie).
// Korzysta z tego samego dwuetapowego obiegu akceptacji (kierownik -> admin).
app.post('/purchase-requests', requireAuth, async (req, res) => {
  const db = await getDb();

  const {
    itemName,
    category = '',
    quantity = 1,
    shopUrl,
    estimatedPrice = '',
    justification = '',
    note = ''
  } = req.body;

  const name = String(itemName || '').trim();
  const url = String(shopUrl || '').trim();
  const reason = String(justification || '').trim();

  if (!name) {
    return res.status(400).json({ message: 'Nazwa sprzętu jest wymagana' });
  }

  if (!/^https?:\/\/.+/i.test(url)) {
    return res.status(400).json({ message: 'Podaj prawidłowy link do sklepu (http/https)' });
  }

  if (!reason) {
    return res.status(400).json({ message: 'Uzasadnienie jest wymagane' });
  }

  // Twardsza blokada duplikatów: ten sam wnioskodawca nie może mieć dwóch
  // oczekujących wniosków o zakup tej samej rzeczy (porównanie po nazwie).
  const existingPurchase = await db.collection(collections.loanRequests).findOne({
    kind: 'purchase',
    requesterEmail: req.user.email,
    status: { $in: ACTIVE_REQUEST_STATUSES },
    itemName: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
  });

  if (existingPurchase) {
    return res.status(409).json({
      message: 'Masz już oczekujący wniosek o zakup tej rzeczy'
    });
  }

  const approverEmail = await resolveApproverEmail(db, req.user.email);

  const purchaseRequest = {
    kind: 'purchase',
    itemName: name,
    category: String(category || '').trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    shopUrl: url,
    estimatedPrice: String(estimatedPrice || '').trim(),
    justification: reason,
    note: String(note || '').trim(),
    requesterEmail: req.user.email,
    requesterName: req.user.fullName || req.user.email,
    approverEmail,
    status: approverEmail ? 'pending_manager' : 'pending_admin',
    requestedAt: new Date(),
    managerApprovedAt: null,
    managerApprovedByEmail: null,
    approvedAt: null,
    approvedByEmail: null,
    rejectedAt: null,
    rejectedByEmail: null,
    decisionNote: null
  };

  const result = await db.collection(collections.loanRequests).insertOne(purchaseRequest);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'purchase_request_created',
    entityType: 'purchase_request',
    entityId: String(result.insertedId),
    payload: { itemName: name, shopUrl: url, quantity: purchaseRequest.quantity },
    createdAt: new Date()
  });

  res.status(201).json({
    message: 'Wniosek o zakup został utworzony',
    requestId: result.insertedId
  });
});

app.post('/my/loan-requests/:id/cancel', requireAuth, async (req, res) => {
  const db = await getDb();

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (requestDoc.requesterEmail !== req.user.email) {
    return res.status(403).json({ message: 'To nie jest Twój wniosek' });
  }

  if (!ACTIVE_REQUEST_STATUSES.includes(requestDoc.status)) {
    return res.status(400).json({ message: 'Można anulować tylko oczekujący wniosek' });
  }

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'cancelled',
        decisionNote: 'Anulowano przez użytkownika',
        rejectedAt: new Date(),
        rejectedByEmail: req.user.email
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_cancelled',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: req.user.email
    },
    createdAt: new Date()
  });

  res.json({ message: 'Wniosek anulowany' });
});

// Kto może czytać/komentować wątek wniosku: wnioskodawca, przypisany decydent
// (kierownik) oraz administracja. Wspólne dla GET i POST komentarzy (Pakiet C).
function canAccessRequestThread(requestDoc, user) {
  if (!requestDoc || !user) return false;
  if (user.role === 'admin') return true;
  if (requestDoc.requesterEmail === user.email) return true;
  if (requestDoc.approverEmail && requestDoc.approverEmail === user.email) return true;
  return false;
}

// Wątek komentarzy do wniosku (osobna kolekcja `comments`). Odczyt.
app.get('/loan-requests/:id/comments', requireAuth, async (req, res) => {
  const db = await getDb();

  let requestId;
  try {
    requestId = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ message: 'Nieprawidłowy identyfikator wniosku' });
  }

  const requestDoc = await db.collection(collections.loanRequests).findOne({ _id: requestId });
  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (!canAccessRequestThread(requestDoc, req.user)) {
    return res.status(403).json({ message: 'Brak dostępu do tego wątku' });
  }

  const comments = await db.collection(collections.comments)
    .find({ requestId: String(requestDoc._id) })
    .sort({ createdAt: 1 })
    .toArray();

  res.json(comments);
});

// Dodanie komentarza do wątku wniosku.
app.post('/loan-requests/:id/comments', requireAuth, async (req, res) => {
  const db = await getDb();
  const text = String(req.body?.text || '').trim();

  if (!text) {
    return res.status(400).json({ message: 'Treść komentarza jest wymagana' });
  }

  if (text.length > 2000) {
    return res.status(400).json({ message: 'Komentarz jest za długi (max 2000 znaków)' });
  }

  let requestId;
  try {
    requestId = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ message: 'Nieprawidłowy identyfikator wniosku' });
  }

  const requestDoc = await db.collection(collections.loanRequests).findOne({ _id: requestId });
  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (!canAccessRequestThread(requestDoc, req.user)) {
    return res.status(403).json({ message: 'Brak dostępu do tego wątku' });
  }

  const now = new Date();
  const comment = {
    requestId: String(requestDoc._id),
    authorEmail: req.user.email,
    authorName: req.user.fullName || req.user.email,
    text,
    createdAt: now
  };

  const result = await db.collection(collections.comments).insertOne(comment);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'request_comment_added',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode || null,
      itemName: requestDoc.itemName || null,
      requesterEmail: requestDoc.requesterEmail
    },
    createdAt: now
  });

  res.status(201).json({ ...comment, _id: result.insertedId });
});

// ===== Etap 1 obiegu: akceptacja kierownika działu =====

app.get('/manager/loan-requests', requireAuth, requireManager, async (req, res) => {
  const db = await getDb();
  const { status } = req.query;

  const query = { approverEmail: req.user.email };
  query.status = status ? String(status).trim() : 'pending_manager';

  const requests = await db.collection(collections.loanRequests)
    .find(query)
    .sort({ requestedAt: -1 })
    .toArray();

  res.json(requests);
});

// Zespół kierownika: użytkownicy, którzy mają tego kierownika ustawionego jako
// odbiorcę wniosków (managerEmail), wraz z przypisanym im sprzętem i aktywnymi
// wnioskami. Zasila boczną zakładkę „Mój zespół" (Pakiet C).
app.get('/manager/team', requireAuth, requireManager, async (req, res) => {
  const db = await getDb();
  const managerEmail = req.user.email;

  const members = await db.collection(collections.users)
    .find({ managerEmail, isActive: { $ne: false } })
    .sort({ fullName: 1 })
    .toArray();

  const emails = members.map(m => m.email);

  if (!emails.length) {
    return res.json([]);
  }

  const [items, requests] = await Promise.all([
    db.collection(collections.items)
      .find({ assignedToEmail: { $in: emails }, isActive: { $ne: false } })
      .sort({ name: 1 })
      .toArray(),
    db.collection(collections.loanRequests)
      .find({ requesterEmail: { $in: emails }, status: { $in: ACTIVE_REQUEST_STATUSES } })
      .sort({ requestedAt: -1 })
      .toArray()
  ]);

  const itemsByUser = new Map();
  const requestsByUser = new Map();
  for (const it of items) {
    if (!itemsByUser.has(it.assignedToEmail)) itemsByUser.set(it.assignedToEmail, []);
    itemsByUser.get(it.assignedToEmail).push(it);
  }
  for (const rq of requests) {
    if (!requestsByUser.has(rq.requesterEmail)) requestsByUser.set(rq.requesterEmail, []);
    requestsByUser.get(rq.requesterEmail).push(rq);
  }

  res.json(members.map(m => ({
    email: m.email,
    fullName: m.fullName || m.email,
    role: m.role || 'user',
    items: itemsByUser.get(m.email) || [],
    activeRequests: requestsByUser.get(m.email) || []
  })));
});

function isRequestApprover(requestDoc, user) {
  return user?.role === 'admin' || requestDoc.approverEmail === user?.email;
}

app.post('/manager/loan-requests/:id/approve', requireAuth, requireManager, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (!isRequestApprover(requestDoc, req.user)) {
    return res.status(403).json({ message: 'Ten wniosek nie jest przypisany do Ciebie' });
  }

  if (requestDoc.status !== 'pending_manager') {
    return res.status(400).json({ message: 'Wniosek nie oczekuje na decyzję kierownika' });
  }

  // Akceptacja kierownika nie wydaje sprzętu – przekazuje wniosek do administracji.
  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'pending_admin',
        managerApprovedAt: new Date(),
        managerApprovedByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_manager_approved',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: requestDoc.requesterEmail
    },
    createdAt: new Date()
  });

  res.json({ message: 'Wniosek przekazany do administracji' });
});

app.post('/manager/loan-requests/:id/reject', requireAuth, requireManager, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (!isRequestApprover(requestDoc, req.user)) {
    return res.status(403).json({ message: 'Ten wniosek nie jest przypisany do Ciebie' });
  }

  if (requestDoc.status !== 'pending_manager') {
    return res.status(400).json({ message: 'Wniosek nie oczekuje na decyzję kierownika' });
  }

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedByEmail: req.user.email,
        managerApprovedByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_manager_rejected',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: requestDoc.requesterEmail
    },
    createdAt: new Date()
  });

  res.json({ message: 'Wniosek odrzucony przez kierownika' });
});

app.post('/loans/borrow', requireAuth, async (req, res) => {
  const db = await getDb();
  const { itemCode, targetUseLocation = 'Dom', borrowNote = '' } = req.body;
  const userEmail = req.user.email;
  const normalizedItemCode = normalizeItemCode(itemCode);

  const item = await db.collection(collections.items).findOne({
    itemCode: normalizedItemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }

  if (isBlockedFromLoan(item)) {
    return res.status(400).json({
      message: 'Tego sprzętu nie można wypożyczyć'
    });
  }

  if (item.operationalStatus !== 'available') {
    return res.status(400).json({ message: 'Item is not available' });
  }

  const loan = {
    itemId: item._id,
    itemCode: normalizedItemCode,
    userEmail,
    quantity: 1,
    fromLocation: item.currentLocation,
    targetUseLocation: String(targetUseLocation || '').trim(),
    status: 'active',
    borrowedAt: new Date(),
    dueAt: null,
    returnedAt: null,
    borrowNote: String(borrowNote || '').trim(),
    returnNote: null,
    createdByEmail: req.user.email,
    closedByEmail: null
  };

  const loanResult = await db.collection(collections.loans).insertOne(loan);

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        operationalStatus: 'loaned',
        currentLocation: 'U pracownika',
        assignedToEmail: userEmail,
        assignedToName: req.user.fullName || req.user.email,
        updatedAt: new Date()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_created',
    entityType: 'loan',
    entityId: String(loanResult.insertedId),
    payload: { itemCode: normalizedItemCode, userEmail },
    createdAt: new Date()
  });

  res.status(201).json({
    message: 'Borrowed',
    loanId: loanResult.insertedId
  });
});

app.post('/loans/return/:id', requireAuth, async (req, res) => {
  const db = await getDb();
  const { returnLocation = 'Magazyn', returnNote = '' } = req.body;

  const loan = await db.collection(collections.loans).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!loan) {
    return res.status(404).json({ message: 'Loan not found' });
  }

  const isOwner = loan.userEmail === req.user.email;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Nie możesz oddać cudzego sprzętu' });
  }

  if (loan.status !== 'active') {
    return res.status(400).json({ message: 'Loan is not active' });
  }

  await db.collection(collections.loans).updateOne(
    { _id: loan._id },
    {
      $set: {
        status: 'returned',
        returnedAt: new Date(),
        returnLocation: String(returnLocation || 'Magazyn').trim(),
        returnNote: String(returnNote || '').trim(),
        closedByEmail: req.user.email
      }
    }
  );

  const itemUpdateResult = await db.collection(collections.items).updateOne(
    { itemCode: String(loan.itemCode || '').trim().toUpperCase() },
    {
      $set: {
        operationalStatus: 'available',
        currentLocation: String(returnLocation || 'Magazyn').trim(),
        assignedToEmail: null,
        assignedToName: null,
        updatedAt: new Date()
      }
    }
  );

  console.log('RETURN ITEM UPDATE RESULT', {
    loanItemCode: loan.itemCode,
    matchedCount: itemUpdateResult.matchedCount,
    modifiedCount: itemUpdateResult.modifiedCount
  });

  if (itemUpdateResult.matchedCount === 0) {
    return res.status(500).json({
      message: `Nie znaleziono sprzętu do zwrotu dla itemCode ${loan.itemCode}`
    });
  }

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_returned',
    entityType: 'loan',
    entityId: String(loan._id),
    payload: {
      itemCode: loan.itemCode,
      userEmail: loan.userEmail,
      returnLocation: String(returnLocation || 'Magazyn').trim()
    },
    createdAt: new Date()
  });

  res.json({ message: 'Returned' });
});

app.get('/admin/items', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();

  // Wycofany/nieaktywny sprzęt zostaje w bazie (ślad), ale znika z UI.
  const items = await db.collection(collections.items)
    .find({ isActive: { $ne: false } })
    .sort({ category: 1, name: 1, itemCode: 1 })
    .toArray();

  res.json(items);
});

// Dane do list rozwijanych w formularzu dodawania sprzętu.
app.get('/admin/form-options', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();

  const [locationDocs, categories, users] = await Promise.all([
    db.collection(collections.locations)
      .find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .toArray(),
    db.collection(collections.items).distinct('category', { category: { $nin: [null, ''] } }),
    db.collection(collections.users)
      .find({ isActive: { $ne: false } }, { projection: { email: 1, fullName: 1 } })
      .sort({ fullName: 1 })
      .toArray()
  ]);

  const locationNames = locationDocs.map(loc => loc.name).filter(Boolean);

  res.json({
    locations: [...new Set([...locationNames, ...FALLBACK_LOCATIONS])],
    categories: categories.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'pl')),
    conditions: ITEM_CONDITIONS,
    users: users.map(u => ({ email: u.email, fullName: u.fullName || u.email }))
  });
});

// Agregaty do dashboardu administracyjnego (Pakiet B – Raporty i dane).
app.get('/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();
  const itemsColl = db.collection(collections.items);
  const activeItems = { isActive: { $ne: false } };

  const [
    statusRows,
    categoryRows,
    conditionRows,
    itemsTotal,
    activeLoans,
    requestRows,
    warrantyDocs
  ] = await Promise.all([
    itemsColl.aggregate([
      { $match: activeItems },
      { $group: { _id: '$operationalStatus', count: { $sum: 1 } } }
    ]).toArray(),
    itemsColl.aggregate([
      { $match: activeItems },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }
    ]).toArray(),
    itemsColl.aggregate([
      { $match: activeItems },
      { $group: { _id: '$conditionStatus', count: { $sum: 1 } } }
    ]).toArray(),
    itemsColl.countDocuments(activeItems),
    db.collection(collections.loans).countDocuments({ status: 'active' }),
    db.collection(collections.loanRequests).aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray(),
    itemsColl
      .find(
        { ...activeItems, warrantyUntil: { $nin: [null, ''] } },
        { projection: { itemCode: 1, name: 1, category: 1, warrantyUntil: 1 } }
      )
      .toArray()
  ]);

  const toMap = (rows) => rows.reduce((acc, r) => {
    const key = r._id == null || r._id === '' ? 'unknown' : String(r._id);
    acc[key] = r.count;
    return acc;
  }, {});

  const requestsByStatus = toMap(requestRows);
  const pendingRequestsTotal = ACTIVE_REQUEST_STATUSES.reduce(
    (sum, status) => sum + (requestsByStatus[status] || 0),
    0
  );

  // Gwarancje: dni do końca względem dziś (00:00). warrantyUntil to string z formularza.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const SOON_DAYS = 30;
  const dayMs = 24 * 60 * 60 * 1000;

  const warrantyItems = warrantyDocs
    .map(doc => {
      const parsed = new Date(doc.warrantyUntil);
      if (Number.isNaN(parsed.getTime())) return null;
      const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      const daysLeft = Math.round((target - today) / dayMs);
      return {
        itemCode: doc.itemCode,
        name: doc.name,
        category: doc.category,
        warrantyUntil: doc.warrantyUntil,
        daysLeft,
        expired: daysLeft < 0
      };
    })
    .filter(Boolean)
    .filter(entry => entry.daysLeft < SOON_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const warrantyExpired = warrantyItems.filter(entry => entry.expired).length;

  res.json({
    itemsTotal,
    itemsByStatus: toMap(statusRows),
    itemsByCategory: categoryRows.map(r => ({
      category: r._id == null || r._id === '' ? 'Bez kategorii' : String(r._id),
      count: r.count
    })),
    itemsByCondition: conditionRows.map(r => ({
      condition: r._id == null || r._id === '' ? '' : String(r._id),
      count: r.count
    })),
    activeLoans,
    pendingRequests: { total: pendingRequestsTotal, byStatus: requestsByStatus },
    warranty: {
      total: warrantyItems.length,
      expired: warrantyExpired,
      soon: warrantyItems.length - warrantyExpired,
      items: warrantyItems.slice(0, 100)
    }
  });
});

// ===== Zarządzanie użytkownikami (tylko admin) =====

app.get('/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();

  const users = await db.collection(collections.users)
    .find({}, { projection: { email: 1, fullName: 1, role: 1, managerEmail: 1, isActive: 1 } })
    .sort({ fullName: 1 })
    .toArray();

  res.json(users);
});

app.patch('/admin/users/:email', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const email = String(req.params.email || '').trim().toLowerCase();
  const { role, managerEmail } = req.body;

  const user = await db.collection(collections.users).findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
  }

  const update = { updatedAt: new Date() };

  if (role !== undefined) {
    if (!['user', 'manager', 'admin', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Nieprawidłowa rola' });
    }
    if (email === req.user.email && role !== 'admin') {
      return res.status(400).json({ message: 'Nie możesz odebrać sobie uprawnień administratora' });
    }
    update.role = role;
  }

  if (managerEmail !== undefined) {
    const normalized = String(managerEmail || '').trim().toLowerCase();

    if (!normalized) {
      update.managerEmail = null;
    } else if (normalized === email) {
      return res.status(400).json({ message: 'Użytkownik nie może być swoim własnym kierownikiem' });
    } else {
      const manager = await db.collection(collections.users).findOne({ email: normalized });
      if (!manager) {
        return res.status(400).json({ message: 'Wskazany kierownik nie istnieje' });
      }
      if (!['manager', 'admin'].includes(manager.role)) {
        return res.status(400).json({ message: 'Wskazana osoba nie ma roli kierownika' });
      }
      update.managerEmail = normalized;
    }
  }

  await db.collection(collections.users).updateOne({ email }, { $set: update });

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'user_updated',
    entityType: 'user',
    entityId: email,
    payload: update,
    createdAt: new Date()
  });

  const updated = await db.collection(collections.users).findOne(
    { email },
    { projection: { email: 1, fullName: 1, role: 1, managerEmail: 1, isActive: 1 } }
  );

  res.json({ message: 'Zaktualizowano użytkownika', user: updated });
});

app.delete('/admin/users/:email', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const email = String(req.params.email || '').trim().toLowerCase();

  if (email === req.user.email) {
    return res.status(400).json({ message: 'Nie możesz usunąć własnego konta' });
  }

  const user = await db.collection(collections.users).findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
  }

  await db.collection(collections.users).deleteOne({ email });

  // Wyzeruj routing wniosków wskazujący na usuniętego użytkownika.
  await db.collection(collections.users).updateMany(
    { managerEmail: email },
    { $set: { managerEmail: null } }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'user_deleted',
    entityType: 'user',
    entityId: email,
    payload: { email, fullName: user.fullName || null, role: user.role || null },
    createdAt: new Date()
  });

  res.json({ message: 'Usunięto użytkownika' });
});

app.post('/admin/items', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const {
    itemCode,
    category,
    name,
    details = '',
    quantity = 1,
    currentLocation = 'Magazyn',
    conditionStatus = 'ok',
    notes = '',
    imageUrl = '',
    thumbnailUrl = '',
    brand = '',
    model = '',
    qrCodeValue = '',
    tags = [],
    serialNumber = '',
    warrantyUntil = '',
    detailedLocation = '',
    isStudioLocked = false,
    assignedToEmail = ''
  } = req.body;

  if (!category || !name) {
    return res.status(400).json({ message: 'category i name są wymagane' });
  }

  // Kod sprzętu nie jest już podawany w formularzu — generujemy go z kategorii.
  // Jeśli mimo to przyszedł (np. import/integracja), respektujemy go i pilnujemy unikalności.
  let normalizedItemCode;
  if (itemCode) {
    normalizedItemCode = normalizeItemCode(itemCode);
    const existing = await db.collection(collections.items).findOne({ itemCode: normalizedItemCode });
    if (existing) {
      return res.status(409).json({ message: 'Taki itemCode już istnieje' });
    }
  } else {
    normalizedItemCode = await generatePurchaseItemCode(db, category);
  }

  const now = new Date();
  const sourceLocation = String(currentLocation || 'Magazyn').trim() || 'Magazyn';

  // Opcjonalne przypisanie sprzętu do użytkownika już przy dodawaniu.
  const normalizedAssignee = String(assignedToEmail || '').trim().toLowerCase();
  let assignedUser = null;

  if (normalizedAssignee) {
    assignedUser = await db.collection(collections.users).findOne({ email: normalizedAssignee });

    if (!assignedUser) {
      return res.status(400).json({ message: 'Wybrany użytkownik nie istnieje' });
    }
  }

  const doc = {
    itemCode: normalizedItemCode,
    category: String(category).trim(),
    name: String(name).trim(),
    details: String(details || '').trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    currentLocation: assignedUser ? 'U pracownika' : sourceLocation,
    conditionStatus: String(conditionStatus || 'ok').trim(),
    operationalStatus: assignedUser ? 'loaned' : 'available',
    assignedToName: assignedUser ? (assignedUser.fullName || assignedUser.email) : null,
    assignedToEmail: assignedUser ? assignedUser.email : null,
    notes: String(notes || '').trim(),
    imageUrl: String(imageUrl || '').trim(),
    thumbnailUrl: String(thumbnailUrl || '').trim(),
    brand: String(brand || '').trim(),
    model: String(model || '').trim(),
    qrCodeValue: String(qrCodeValue || '').trim(),
    tags: normalizeTags(tags),
    serialNumber: String(serialNumber || '').trim(),
    warrantyUntil: String(warrantyUntil || '').trim(),
    detailedLocation: String(detailedLocation || '').trim(),
    isStudioLocked: parseBoolean(isStudioLocked),
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  const result = await db.collection(collections.items).insertOne(doc);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'item_created',
    entityType: 'item',
    entityId: String(result.insertedId),
    payload: doc,
    createdAt: now
  });

  // Sprzęt dodany od razu „na stanie pracownika” = utworzenie wypożyczenia.
  if (assignedUser) {
    const loan = {
      itemId: result.insertedId,
      itemCode: normalizedItemCode,
      userEmail: assignedUser.email,
      userDisplayName: assignedUser.fullName || assignedUser.email,
      quantity: 1,
      fromLocation: sourceLocation,
      targetUseLocation: 'U pracownika',
      status: 'active',
      borrowedAt: now,
      dueAt: null,
      returnedAt: null,
      borrowNote: 'Przypisano przy dodawaniu sprzętu',
      returnNote: null,
      createdByEmail: req.user.email,
      closedByEmail: null
    };

    const loanResult = await db.collection(collections.loans).insertOne(loan);

    await db.collection(collections.auditLogs).insertOne({
      actorEmail: req.user.email,
      actionType: 'loan_created',
      entityType: 'loan',
      entityId: String(loanResult.insertedId),
      payload: { itemCode: normalizedItemCode, userEmail: assignedUser.email },
      createdAt: now
    });
  }

  res.status(201).json({
    message: 'Item created',
    id: result.insertedId,
    item: doc
  });
});

// Import zbiorczy sprzętu z CSV (Pakiet B). Body: { items: [{...}] }.
// Waliduje pola wymagane oraz duplikaty kodów (w pliku i w bazie); zwraca raport.
app.post('/admin/items/bulk', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const rawItems = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!rawItems) {
    return res.status(400).json({ message: 'Body musi zawierać tablicę items' });
  }
  if (!rawItems.length) {
    return res.status(400).json({ message: 'Lista do importu jest pusta' });
  }
  if (rawItems.length > 500) {
    return res.status(400).json({ message: 'Maksymalnie 500 pozycji na jeden import' });
  }

  const now = new Date();
  const errors = [];
  const valid = [];
  const seenInFile = new Set();

  // Walidacja wstępna + wychwycenie duplikatów w obrębie pliku.
  rawItems.forEach((row, index) => {
    const rowNumber = index + 1;
    const itemCode = normalizeItemCode(row?.itemCode);
    const name = String(row?.name || '').trim();
    const category = String(row?.category || '').trim();

    if (!itemCode || !name || !category) {
      errors.push({ row: rowNumber, itemCode, message: 'Brak wymaganych pól (kod, nazwa, kategoria)' });
      return;
    }

    if (seenInFile.has(itemCode)) {
      errors.push({ row: rowNumber, itemCode, message: 'Zduplikowany kod w pliku' });
      return;
    }
    seenInFile.add(itemCode);

    valid.push({ rowNumber, row, itemCode, name, category });
  });

  // Duplikaty względem bazy – jedno zapytanie na całą paczkę.
  let existingCodes = new Set();
  if (valid.length) {
    const found = await db.collection(collections.items)
      .find({ itemCode: { $in: valid.map(v => v.itemCode) } }, { projection: { itemCode: 1 } })
      .toArray();
    existingCodes = new Set(found.map(f => f.itemCode));
  }

  const docs = [];
  valid.forEach(entry => {
    if (existingCodes.has(entry.itemCode)) {
      errors.push({ row: entry.rowNumber, itemCode: entry.itemCode, message: 'Kod już istnieje w bazie' });
      return;
    }

    const row = entry.row;
    docs.push({
      itemCode: entry.itemCode,
      category: entry.category,
      name: entry.name,
      details: String(row.details || '').trim(),
      quantity: Math.max(1, Number(row.quantity) || 1),
      currentLocation: String(row.currentLocation || 'Magazyn').trim() || 'Magazyn',
      conditionStatus: normalizeConditionStatus(row.conditionStatus),
      operationalStatus: 'available',
      assignedToName: null,
      assignedToEmail: null,
      notes: String(row.notes || '').trim(),
      imageUrl: String(row.imageUrl || '').trim(),
      thumbnailUrl: String(row.thumbnailUrl || '').trim(),
      brand: String(row.brand || '').trim(),
      model: String(row.model || '').trim(),
      qrCodeValue: String(row.qrCodeValue || '').trim(),
      tags: normalizeTags(row.tags),
      serialNumber: String(row.serialNumber || '').trim(),
      warrantyUntil: String(row.warrantyUntil || '').trim(),
      detailedLocation: String(row.detailedLocation || '').trim(),
      isStudioLocked: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });
  });

  let added = 0;
  if (docs.length) {
    const result = await db.collection(collections.items).insertMany(docs, { ordered: false });
    added = result.insertedCount;

    // Po jednym wpisie audytu na sprzęt – spójnie z dodawaniem pojedynczym
    // i potrzebne dla historii konkretnego sprzętu (payload.itemCode + entityId).
    const auditDocs = docs.map((doc, i) => ({
      actorEmail: req.user.email,
      actionType: 'item_created',
      entityType: 'item',
      entityId: String(result.insertedIds[i]),
      payload: doc,
      createdAt: now
    }));
    await db.collection(collections.auditLogs).insertMany(auditDocs);
  }

  res.status(added ? 201 : 200).json({
    message: `Zaimportowano ${added} z ${rawItems.length} pozycji`,
    added,
    skipped: errors.length,
    total: rawItems.length,
    errors
  });
});

app.patch('/admin/items/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const {
    itemCode,
    category,
    name,
    details,
    quantity,
    currentLocation,
    conditionStatus,
    operationalStatus,
    notes,
    imageUrl,
    thumbnailUrl,
    brand,
    model,
    qrCodeValue,
    tags,
    serialNumber,
    warrantyUntil,
    detailedLocation,
    isStudioLocked,
    isActive,
    priceBatches
  } = req.body;

  const itemId = new ObjectId(req.params.id);
  const update = {
    updatedAt: new Date()
  };

  if (itemCode !== undefined) update.itemCode = normalizeItemCode(itemCode);
  if (category !== undefined) update.category = String(category).trim();
  if (name !== undefined) update.name = String(name).trim();
  if (details !== undefined) update.details = String(details || '').trim();
  if (quantity !== undefined) update.quantity = Math.max(1, Number(quantity) || 1);
  if (currentLocation !== undefined) update.currentLocation = String(currentLocation).trim();
  if (conditionStatus !== undefined) update.conditionStatus = String(conditionStatus).trim();
  if (operationalStatus !== undefined) update.operationalStatus = String(operationalStatus).trim();
  if (notes !== undefined) update.notes = String(notes || '').trim();
  if (imageUrl !== undefined) update.imageUrl = String(imageUrl || '').trim();
  if (thumbnailUrl !== undefined) update.thumbnailUrl = String(thumbnailUrl || '').trim();
  if (brand !== undefined) update.brand = String(brand || '').trim();
  if (model !== undefined) update.model = String(model || '').trim();
  if (qrCodeValue !== undefined) update.qrCodeValue = String(qrCodeValue || '').trim();
  if (tags !== undefined) update.tags = normalizeTags(tags);
  if (serialNumber !== undefined) update.serialNumber = String(serialNumber || '').trim();
  if (warrantyUntil !== undefined) update.warrantyUntil = String(warrantyUntil || '').trim();
  if (detailedLocation !== undefined) update.detailedLocation = String(detailedLocation || '').trim();
  if (isStudioLocked !== undefined) update.isStudioLocked = parseBoolean(isStudioLocked);
  if (isActive !== undefined) update.isActive = parseBoolean(isActive);

  // Partie cenowe: zapis listy. Gdy są partie, łączna ilość = ich suma (partie są
  // źródłem prawdy). Gdy brak partii, NIE ruszamy `quantity` — chroni to legacy
  // pozycje (np. „Towar") z ręczną ilością przed wyzerowaniem przy edycji nazwy.
  if (priceBatches !== undefined) {
    update.priceBatches = normalizePriceBatches(priceBatches);
    if (update.priceBatches.length) {
      update.quantity = update.priceBatches.reduce((sum, b) => sum + b.qty, 0);
    }
  }

  const existingItem = await db.collection(collections.items).findOne({ _id: itemId });

  if (!existingItem) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  // Kod podąża za kategorią: gdy zmienia się kategoria (na magazynową) i kod nie
  // został podany ręcznie, aktualizujemy prefiks kodu względem nowej kategorii.
  if (update.itemCode === undefined && update.category && update.category !== existingItem.category
      && isWarehouseCategory(update.category)) {
    const regen = await regenerateItemCodeForCategory(db, existingItem.itemCode, update.category);
    if (regen && regen !== existingItem.itemCode) update.itemCode = regen;
  }

  if (update.itemCode && update.itemCode !== existingItem.itemCode) {
    const duplicate = await db.collection(collections.items).findOne({
      _id: { $ne: itemId },
      itemCode: update.itemCode
    });

    if (duplicate) {
      return res.status(409).json({ message: 'Taki itemCode już istnieje' });
    }
  }

  await db.collection(collections.items).updateOne(
    { _id: itemId },
    { $set: update }
  );

  // Zmiana kodu → przenieś klucze obce w pozostałych kolekcjach.
  if (update.itemCode && update.itemCode !== existingItem.itemCode) {
    await cascadeItemCodeRename(db, existingItem.itemCode, update.itemCode);
  }

  const updatedItem = await db.collection(collections.items).findOne({ _id: itemId });

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'item_updated',
    entityType: 'item',
    entityId: String(itemId),
    payload: update,
    createdAt: new Date()
  });

  res.json({
    message: 'Item updated',
    item: updatedItem
  });
});

app.delete('/admin/items/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const item = await db.collection(collections.items).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        isActive: false,
        operationalStatus: 'inactive',
        updatedAt: new Date()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'item_deactivated',
    entityType: 'item',
    entityId: String(item._id),
    payload: { itemCode: item.itemCode },
    createdAt: new Date()
  });

  res.json({ message: 'Item deactivated' });
});

// Wycofanie sprzętu z magazynu (zepsuty / zgubiony). Sprzęt zostaje w bazie
// jako ślad (status 'discarded', powód, kto i kiedy), ale znika ze wszystkich
// widoków UI. Zamykamy też ewentualne aktywne wypożyczenie.
app.post('/admin/items/:id/discard', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { reason = '' } = req.body;
  const discardReason = String(reason || '').trim() || 'Wycofano';

  const item = await db.collection(collections.items).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  if (item.isActive === false) {
    return res.status(400).json({ message: 'Ten sprzęt został już wycofany' });
  }

  const now = new Date();

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        operationalStatus: 'discarded',
        isActive: false,
        assignedToEmail: null,
        assignedToName: null,
        discardReason,
        discardedAt: now,
        discardedByEmail: req.user.email,
        updatedAt: now
      }
    }
  );

  // Jeśli sprzęt był u kogoś — zamknij aktywne wypożyczenie.
  await db.collection(collections.loans).updateMany(
    { itemCode: item.itemCode, status: 'active' },
    {
      $set: {
        status: 'returned',
        returnedAt: now,
        returnLocation: 'Wycofany',
        returnNote: `Sprzęt wycofany z magazynu: ${discardReason}`,
        closedByEmail: req.user.email
      }
    }
  );

  // Aktywne wnioski o wypożyczenie tego sprzętu nie mają już sensu — odrzuć je
  // z czytelną notatką i zostaw ślad w historii (Pakiet C).
  const affectedRequests = await db.collection(collections.loanRequests)
    .find({ itemCode: item.itemCode, status: { $in: ACTIVE_REQUEST_STATUSES } })
    .project({ _id: 1, requesterEmail: 1 })
    .toArray();

  if (affectedRequests.length) {
    const rejectionNote = `Sprzęt wycofany z magazynu: ${discardReason}`;

    await db.collection(collections.loanRequests).updateMany(
      { itemCode: item.itemCode, status: { $in: ACTIVE_REQUEST_STATUSES } },
      {
        $set: {
          status: 'rejected',
          rejectedAt: now,
          rejectedByEmail: req.user.email,
          decisionNote: rejectionNote
        }
      }
    );

    await db.collection(collections.auditLogs).insertMany(
      affectedRequests.map(rq => ({
        actorEmail: req.user.email,
        actionType: 'loan_request_auto_rejected',
        entityType: 'loan_request',
        entityId: String(rq._id),
        payload: {
          itemCode: item.itemCode,
          requesterEmail: rq.requesterEmail,
          reason: discardReason
        },
        createdAt: now
      }))
    );
  }

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'item_discarded',
    entityType: 'item',
    entityId: String(item._id),
    payload: { itemCode: item.itemCode, reason: discardReason },
    createdAt: now
  });

  res.json({ message: 'Sprzęt wycofany z magazynu' });
});

// Przeniesienie sprzętu na inną osobę (transfer). Zamyka ewentualne aktywne
// wypożyczenie obecnego posiadacza i otwiera nowe dla wskazanej osoby. Osoba
// docelowa jest wymagana — zwrot do magazynu robi się zwykłym przepływem zwrotu.
// Wspólna logika transferu sprzętu na inną osobę: zamyka aktywne wypożyczenie
// obecnego posiadacza, otwiera nowe dla osoby docelowej, aktualizuje sprzęt
// (na „U pracownika"), dopisuje audyt i powiadomienie dla administracji.
// Używane przez transfer admina (panel) oraz transfer pracownika („Mój sprzęt").
async function performItemTransfer(db, item, targetUser, actor, note) {
  const now = new Date();
  const transferNote = String(note || '').trim();
  const targetEmail = targetUser.email;
  const targetName = targetUser.fullName || targetUser.email;
  const fromEmail = item.assignedToEmail || null;
  const fromName = item.assignedToName || null;
  const actorEmail = actor.email;
  const actorName = actor.fullName || actor.email;

  // Zamknij aktywne wypożyczenie obecnego posiadacza (jeśli sprzęt był u kogoś).
  await db.collection(collections.loans).updateMany(
    { itemCode: item.itemCode, status: 'active' },
    {
      $set: {
        status: 'returned',
        returnedAt: now,
        returnLocation: 'Transfer',
        returnNote: transferNote
          ? `Przeniesiono na ${targetName}: ${transferNote}`
          : `Przeniesiono na ${targetName}`,
        closedByEmail: actorEmail
      }
    }
  );

  // Otwórz nowe wypożyczenie dla osoby docelowej.
  const loan = {
    itemId: item._id,
    itemCode: item.itemCode,
    userEmail: targetEmail,
    userDisplayName: targetName,
    quantity: 1,
    fromLocation: item.currentLocation || 'Transfer',
    targetUseLocation: 'U pracownika',
    status: 'active',
    borrowedAt: now,
    dueAt: null,
    returnedAt: null,
    borrowNote: transferNote
      ? `Transfer od ${fromName || fromEmail || 'magazynu'}: ${transferNote}`
      : `Transfer od ${fromName || fromEmail || 'magazynu'}`,
    returnNote: null,
    createdByEmail: actorEmail,
    closedByEmail: null
  };

  const loanResult = await db.collection(collections.loans).insertOne(loan);

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        operationalStatus: 'loaned',
        currentLocation: 'U pracownika',
        assignedToEmail: targetEmail,
        assignedToName: targetName,
        updatedAt: now
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail,
    actionType: 'item_transferred',
    entityType: 'item',
    entityId: String(item._id),
    payload: {
      itemCode: item.itemCode,
      itemName: item.name,
      fromEmail,
      fromName,
      toEmail: targetEmail,
      toName: targetName,
      loanId: String(loanResult.insertedId)
    },
    createdAt: now
  });

  // Powiadomienie dla administracji, że transfer został wykonany.
  await db.collection(collections.notifications).insertOne({
    kind: 'transfer',
    status: 'open',
    itemCode: item.itemCode,
    itemName: item.name,
    fromEmail,
    fromName,
    toEmail: targetEmail,
    toName: targetName,
    message: transferNote || '',
    createdAt: now,
    createdByEmail: actorEmail,
    createdByName: actorName,
    resolvedAt: null,
    resolvedByEmail: null
  });

  return { targetName, loanId: loanResult.insertedId };
}

app.post('/admin/items/:id/transfer', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { toEmail = '', note = '' } = req.body;
  const targetEmail = String(toEmail || '').trim().toLowerCase();

  if (!targetEmail) {
    return res.status(400).json({ message: 'Wskaż osobę, na którą przenosisz sprzęt' });
  }

  let itemId;
  try {
    itemId = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ message: 'Nieprawidłowy identyfikator sprzętu' });
  }

  const item = await db.collection(collections.items).findOne({ _id: itemId });

  if (!item || item.isActive === false) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  if (isBlockedFromLoan(item)) {
    return res.status(400).json({ message: 'Tego sprzętu nie można przenosić' });
  }

  if (item.assignedToEmail === targetEmail) {
    return res.status(400).json({ message: 'Sprzęt jest już przypisany do tej osoby' });
  }

  const targetUser = await db.collection(collections.users).findOne({
    email: targetEmail,
    isActive: { $ne: false }
  });

  if (!targetUser) {
    return res.status(404).json({ message: 'Nie znaleziono aktywnego użytkownika o tym adresie' });
  }

  const { targetName } = await performItemTransfer(db, item, targetUser, req.user, note);
  res.json({ message: `Przeniesiono na ${targetName}`, itemCode: item.itemCode });
});

// ===== Powiadomienia / zgłoszenia dla administracji (Mój sprzęt + transfery) =====

app.get('/admin/notifications', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { status } = req.query;

  const query = {};
  if (status) query.status = String(status).trim();

  const notifications = await db.collection(collections.notifications)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  res.json(notifications);
});

// Lekki licznik nieprzeczytanych (otwartych) zgłoszeń — zasila badge w menu.
app.get('/admin/notifications/count', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();
  const open = await db.collection(collections.notifications).countDocuments({ status: 'open' });
  res.json({ open });
});

app.post('/admin/notifications/:id/resolve', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  let id;
  try {
    id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ message: 'Nieprawidłowy identyfikator zgłoszenia' });
  }

  const notification = await db.collection(collections.notifications).findOne({ _id: id });
  if (!notification) {
    return res.status(404).json({ message: 'Zgłoszenie nie istnieje' });
  }

  if (notification.status === 'resolved') {
    return res.status(400).json({ message: 'Zgłoszenie jest już załatwione' });
  }

  await db.collection(collections.notifications).updateOne(
    { _id: id },
    { $set: { status: 'resolved', resolvedAt: new Date(), resolvedByEmail: req.user.email } }
  );

  res.json({ message: 'Oznaczono jako załatwione' });
});

app.get('/admin/loans', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { status } = req.query;

  const query = {};
  if (status) query.status = String(status).trim();

  const loans = await db.collection(collections.loans)
    .find(query)
    .sort({ borrowedAt: -1 })
    .toArray();

  // Dołączamy nazwę sprzętu, żeby tabela admina mogła pokazać nazwę zamiast kodu.
  const codes = [...new Set(loans.map(l => l.itemCode).filter(Boolean))];
  const items = codes.length
    ? await db.collection(collections.items)
        .find({ itemCode: { $in: codes } }, { projection: { itemCode: 1, name: 1 } })
        .toArray()
    : [];
  const nameByCode = new Map(items.map(it => [it.itemCode, it.name]));

  res.json(loans.map(l => ({ ...l, itemName: nameByCode.get(l.itemCode) || '' })));
});

app.get('/admin/loan-requests', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { status } = req.query;

  const query = {};
  if (status) query.status = String(status).trim();

  const requests = await db.collection(collections.loanRequests)
    .find(query)
    .sort({ requestedAt: -1 })
    .toArray();

  res.json(requests);
});

app.post('/admin/loan-requests/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (!['pending_admin', 'pending'].includes(requestDoc.status)) {
    return res.status(400).json({
      message: requestDoc.status === 'pending_manager'
        ? 'Wniosek czeka jeszcze na akceptację kierownika'
        : 'Wniosek nie oczekuje już na decyzję'
    });
  }

  // Wniosek o zakup: akceptacja nie tworzy od razu sprzętu — uruchamia
  // procedurę zakupową (Do zamówienia -> Zamówiony -> dodanie do magazynu).
  if (requestDoc.kind === 'purchase') {
    await db.collection(collections.loanRequests).updateOne(
      { _id: requestDoc._id },
      {
        $set: {
          status: 'to_order',
          approvedAt: new Date(),
          approvedByEmail: req.user.email,
          decisionNote: String(decisionNote || '').trim()
        }
      }
    );

    await db.collection(collections.auditLogs).insertOne({
      actorEmail: req.user.email,
      actionType: 'purchase_request_approved',
      entityType: 'purchase_request',
      entityId: String(requestDoc._id),
      payload: { itemName: requestDoc.itemName, shopUrl: requestDoc.shopUrl },
      createdAt: new Date()
    });

    return res.json({ message: 'Wniosek zatwierdzony — do zamówienia' });
  }

  const item = await db.collection(collections.items).findOne({
    itemCode: requestDoc.itemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Sprzęt nie istnieje' });
  }

  if (isBlockedFromLoan(item)) {
    return res.status(400).json({ message: 'Tego sprzętu nie można wypożyczyć' });
  }

  if (item.operationalStatus !== 'available') {
    return res.status(400).json({ message: 'Sprzęt nie jest już dostępny' });
  }

  const loan = {
    itemId: item._id,
    itemCode: requestDoc.itemCode,
    userEmail: requestDoc.requesterEmail,
    quantity: 1,
    fromLocation: item.currentLocation,
    targetUseLocation: requestDoc.targetUseLocation || 'Dom',
    status: 'active',
    borrowedAt: new Date(),
    dueAt: requestDoc.requestedReturnDate ? new Date(requestDoc.requestedReturnDate) : null,
    returnedAt: null,
    borrowNote: requestDoc.note || requestDoc.purpose || '',
    returnNote: null,
    createdByEmail: req.user.email,
    closedByEmail: null
  };

  const loanResult = await db.collection(collections.loans).insertOne(loan);

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'approved',
        approvedAt: new Date(),
        approvedByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        operationalStatus: 'loaned',
        currentLocation: 'U pracownika',
        assignedToEmail: requestDoc.requesterEmail,
        assignedToName: requestDoc.requesterName || null,
        updatedAt: new Date()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_approved',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: requestDoc.requesterEmail,
      loanId: String(loanResult.insertedId)
    },
    createdAt: new Date()
  });

  res.json({
    message: 'Wniosek zaakceptowany',
    loanId: loanResult.insertedId
  });
});

app.post('/admin/loan-requests/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (!ACTIVE_REQUEST_STATUSES.includes(requestDoc.status)) {
    return res.status(400).json({ message: 'Wniosek nie oczekuje już na decyzję' });
  }

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_rejected',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: requestDoc.requesterEmail
    },
    createdAt: new Date()
  });

  res.json({ message: 'Wniosek odrzucony' });
});

// ===== Procedura zakupowa (wniosek kind='purchase' po zatwierdzeniu) =====

// Krok 2: oznaczenie zatwierdzonego zakupu jako zamówiony.
app.post('/admin/purchase-requests/:id/order', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc || requestDoc.kind !== 'purchase') {
    return res.status(404).json({ message: 'Wniosek o zakup nie istnieje' });
  }

  if (requestDoc.status !== 'to_order') {
    return res.status(400).json({ message: 'Wniosek nie jest w stanie „Do zamówienia”' });
  }

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'ordered',
        orderedAt: new Date(),
        orderedByEmail: req.user.email,
        orderNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'purchase_request_ordered',
    entityType: 'purchase_request',
    entityId: String(requestDoc._id),
    payload: { itemName: requestDoc.itemName, shopUrl: requestDoc.shopUrl },
    createdAt: new Date()
  });

  res.json({ message: 'Oznaczono jako zamówiony' });
});

// Krok 3: dodanie zamówionego sprzętu do magazynu i natychmiastowe
// przypisanie go osobie, która składała wniosek (tworzy wypożyczenie).
app.post('/admin/purchase-requests/:id/stock', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc || requestDoc.kind !== 'purchase') {
    return res.status(404).json({ message: 'Wniosek o zakup nie istnieje' });
  }

  if (requestDoc.status !== 'ordered') {
    return res.status(400).json({ message: 'Najpierw oznacz wniosek jako zamówiony' });
  }

  const now = new Date();

  // Wnioskodawca — bierzemy świeże imię/nazwisko, jeśli konto wciąż istnieje.
  const requester = await db.collection(collections.users).findOne({
    email: requestDoc.requesterEmail
  });
  const assigneeEmail = requestDoc.requesterEmail;
  const assigneeName =
    requester?.fullName || requestDoc.requesterName || requestDoc.requesterEmail;

  const itemCode = await generatePurchaseItemCode(db, requestDoc.category);

  const itemDoc = {
    itemCode,
    category: String(requestDoc.category || 'Zakup').trim() || 'Zakup',
    name: String(requestDoc.itemName || 'Nowy sprzęt').trim(),
    details: '',
    quantity: Math.max(1, Number(requestDoc.quantity) || 1),
    currentLocation: 'U pracownika',
    conditionStatus: 'new',
    operationalStatus: 'loaned',
    assignedToName: assigneeName,
    assignedToEmail: assigneeEmail,
    notes: requestDoc.justification
      ? `Z wniosku o zakup: ${requestDoc.justification}`
      : 'Dodano z wniosku o zakup',
    imageUrl: '',
    thumbnailUrl: '',
    brand: '',
    model: '',
    qrCodeValue: '',
    tags: [],
    isStudioLocked: false,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  const itemResult = await db.collection(collections.items).insertOne(itemDoc);

  const loan = {
    itemId: itemResult.insertedId,
    itemCode,
    userEmail: assigneeEmail,
    userDisplayName: assigneeName,
    quantity: itemDoc.quantity,
    fromLocation: 'Zakup',
    targetUseLocation: 'U pracownika',
    status: 'active',
    borrowedAt: now,
    dueAt: null,
    returnedAt: null,
    borrowNote: 'Zakup nowego sprzętu na wniosek',
    returnNote: null,
    createdByEmail: req.user.email,
    closedByEmail: null
  };

  const loanResult = await db.collection(collections.loans).insertOne(loan);

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'fulfilled',
        fulfilledAt: now,
        fulfilledByEmail: req.user.email,
        resultItemCode: itemCode
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'purchase_request_stocked',
    entityType: 'purchase_request',
    entityId: String(requestDoc._id),
    payload: {
      itemName: requestDoc.itemName,
      itemCode,
      assignedToEmail: assigneeEmail,
      loanId: String(loanResult.insertedId)
    },
    createdAt: now
  });

  res.json({
    message: 'Dodano do magazynu i przypisano wnioskodawcy',
    itemCode
  });
});

// Anulowanie zatwierdzonego zakupu w trakcie procedury (Do zamówienia /
// Zamówiony) — np. towar zniknął ze sklepu albo decyzja się zmieniła.
app.post('/admin/purchase-requests/:id/cancel', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  let requestId;
  try {
    requestId = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ message: 'Nieprawidłowy identyfikator wniosku' });
  }

  const requestDoc = await db.collection(collections.loanRequests).findOne({ _id: requestId });

  if (!requestDoc || requestDoc.kind !== 'purchase') {
    return res.status(404).json({ message: 'Wniosek o zakup nie istnieje' });
  }

  if (!['to_order', 'ordered'].includes(requestDoc.status)) {
    return res.status(400).json({
      message: 'Anulować można tylko zakup w trakcie procedury (Do zamówienia / Zamówiony)'
    });
  }

  const now = new Date();

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: now,
        cancelledByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'purchase_request_cancelled',
    entityType: 'purchase_request',
    entityId: String(requestDoc._id),
    payload: { itemName: requestDoc.itemName, shopUrl: requestDoc.shopUrl },
    createdAt: now
  });

  res.json({ message: 'Zakup anulowany' });
});

app.get('/admin/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const {
    actorEmail,
    entityType,
    entityId,
    actionType,
    itemCode,
    from,
    to,
    limit = '100'
  } = req.query;

  const query = {};

  if (actorEmail) {
    query.actorEmail = actorEmail.trim().toLowerCase();
  }

  if (entityType) {
    query.entityType = entityType.trim();
  }

  if (entityId) {
    query.entityId = String(entityId).trim();
  }

  if (actionType) {
    query.actionType = actionType.trim();
  }

  if (itemCode) {
    query['payload.itemCode'] = {
      $regex: new RegExp(itemCode.trim(), 'i')
    };
  }

  // Zakres dat na createdAt (YYYY-MM-DD). `to` włączające — do końca dnia.
  const parseDay = (s, endOfDay) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const fromDate = parseDay(from, false);
  const toDate = parseDay(to, true);
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = fromDate;
    if (toDate) query.createdAt.$lte = toDate;
  }

  const safeLimit = Math.min(Number(limit) || 100, 500);

  const logs = await db.collection(collections.auditLogs)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .toArray();

  res.json(logs);
});

let bootPromise = null;

function ensureBoot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      const db = await getDb();
      await ensureIndexes(db);

      // Migracja zaszłości: wnioski sprzed dwuetapowej akceptacji ('pending')
      // traktujemy jak gotowe do realizacji przez administrację.
      await db.collection(collections.loanRequests).updateMany(
        { status: 'pending' },
        { $set: { status: 'pending_admin', approverEmail: null } }
      );

      // Seed routingu wniosków z mapy startowej dla użytkowników bez pola
      // managerEmail. Warunek $exists:false czyni to jednorazowym per użytkownik –
      // późniejsze zmiany admina (także ustawienie na null) nie są nadpisywane.
      for (const [subordinate, managerEmail] of Object.entries(MANAGER_MAP)) {
        await db.collection(collections.users).updateOne(
          { email: subordinate, managerEmail: { $exists: false } },
          { $set: { managerEmail } }
        );
      }
    })();
  }
  return bootPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureBoot();
    next();
  } catch (err) {
    next(err);
  }
});

export default app;