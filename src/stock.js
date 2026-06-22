// Magazyn „w stylu Odoo" – warstwa logiki stanu (Faza 0).
//
// Zasada jak w Odoo: STANU SIĘ NIE USTAWIA. Stan to suma niezmiennych ruchów.
// Każdy ruch (`stockMoves`) idzie z lokalizacji źródłowej do docelowej.
// `quants` to zmaterializowany stan na (towar, lokalizacja, partia) – zawsze
// dający się odtworzyć z rejestru przez `recomputeQuants`.
//
// Wszystkie funkcje przyjmują `db` jako argument, więc działają tak samo
// z serwera (getDb) jak i ze skryptów (własny MongoClient).

import { ObjectId } from 'mongodb';
import { collections } from './schema.js';

// Rodzaje lokalizacji (semantyka Odoo). Trzymamy w polu `kind`, żeby nie kolidować
// z istniejącym, nieużywanym polem `type` na starych dokumentach lokalizacji.
export const LOCATION_KINDS = {
  VIEW: 'view',           // węzeł grupujący, nie trzyma stanu
  INTERNAL: 'internal',   // realny magazyn (Magazyn, Studio, Biuro, Serwis…)
  EMPLOYEE: 'employee',   // „u pracownika" – sprzęt wydany, wciąż nasz
  INVENTORY: 'inventory', // wirtualna: korekty / stan otwarcia (źródło-ujście)
  SCRAP: 'scrap',         // wirtualna: złom / wybrakowane
  SUPPLIER: 'supplier',   // wirtualna: przyjęcia od dostawców
  TRANSIT: 'transit'      // wirtualna: tranzyt między lokalizacjami
};

// Lokalizacje, na których liczymy realny „stan posiadania".
// Wirtualne (inventory/scrap/supplier/transit) są źródłami/ujściami i mogą schodzić poniżej zera.
export function isStockableKind(kind) {
  return kind === LOCATION_KINDS.INTERNAL || kind === LOCATION_KINDS.EMPLOYEE;
}

export function isVirtualKind(kind) {
  return (
    kind === LOCATION_KINDS.INVENTORY ||
    kind === LOCATION_KINDS.SCRAP ||
    kind === LOCATION_KINDS.SUPPLIER ||
    kind === LOCATION_KINDS.TRANSIT
  );
}

// Standardowe drzewo lokalizacji. WAŻNE: nazwy realnych lokalizacji muszą zostać
// zgodne z tym, czego używa istniejąca apka (items.currentLocation: „Magazyn"
// itd.), więc dopasowujemy je po `matchName` do już istniejących dokumentów.
export const STANDARD_LOCATIONS = [
  { code: 'WH', name: 'Magazyn główny', kind: LOCATION_KINDS.VIEW, parentCode: null, matchName: null },
  { code: 'WH/Stock', name: 'Magazyn', kind: LOCATION_KINDS.INTERNAL, parentCode: 'WH', matchName: 'Magazyn' },
  { code: 'WH/Studio', name: 'Studio', kind: LOCATION_KINDS.INTERNAL, parentCode: 'WH', matchName: 'Studio' },
  { code: 'WH/Biuro', name: 'Biuro', kind: LOCATION_KINDS.INTERNAL, parentCode: 'WH', matchName: 'Biuro' },
  { code: 'WH/Serwis', name: 'Serwis', kind: LOCATION_KINDS.INTERNAL, parentCode: 'WH', matchName: 'Serwis' },
  { code: 'WH/Employees', name: 'U pracownika', kind: LOCATION_KINDS.EMPLOYEE, parentCode: 'WH', matchName: 'U pracownika' },

  { code: 'VIRT', name: 'Lokalizacje wirtualne', kind: LOCATION_KINDS.VIEW, parentCode: null, matchName: null },
  { code: 'VIRT/Inventory', name: 'Korekta stanu (wirtualna)', kind: LOCATION_KINDS.INVENTORY, parentCode: 'VIRT', matchName: null },
  { code: 'VIRT/Scrap', name: 'Złom / wybrakowane', kind: LOCATION_KINDS.SCRAP, parentCode: 'VIRT', matchName: null },
  { code: 'VIRT/Suppliers', name: 'Dostawcy (przyjęcia)', kind: LOCATION_KINDS.SUPPLIER, parentCode: 'VIRT', matchName: null }
];

function toObjectIdOrNull(value) {
  try {
    return new ObjectId(String(value));
  } catch {
    return null;
  }
}

function quantKey(itemCode, locationId, lot) {
  return JSON.stringify([itemCode, locationId, lot == null ? null : String(lot)]);
}

function normalizeLot(lot) {
  return lot != null && lot !== '' ? String(lot) : null;
}

// Tworzy/uzupełnia standardowe drzewo lokalizacji. Idempotentne.
// Zwraca Mapę code -> dokument lokalizacji (ze świeżym _id).
export async function seedStandardLocations(db) {
  const col = db.collection(collections.locations);
  const byCode = new Map();

  for (const def of STANDARD_LOCATIONS) {
    const parent = def.parentCode ? byCode.get(def.parentCode) : null;
    const parentId = parent ? String(parent._id) : null;
    const ancestors = parent ? [...(parent.ancestors || []), parent.code] : [];

    const matchFilter = def.matchName
      ? { $or: [{ code: def.code }, { name: def.matchName }] }
      : { code: def.code };

    await col.updateOne(
      matchFilter,
      {
        $set: {
          code: def.code,
          name: def.name,
          kind: def.kind,
          parentId,
          ancestors,
          isActive: true,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    const saved = await col.findOne({ code: def.code });
    byCode.set(def.code, saved);
  }

  return byCode;
}

// Atomowa zmiana stanu na jednej lokalizacji (upsert + $inc). Bez transakcji,
// więc działa tak samo na standalone Mongo (lokalnie) i na replica secie (Atlas).
async function adjustQuant(db, itemCode, locationId, lot, delta) {
  await db.collection(collections.quants).updateOne(
    { itemCode, locationId, lot },
    {
      $inc: { quantity: delta },
      $setOnInsert: { reservedQty: 0 },
      $set: { updatedAt: new Date() }
    },
    { upsert: true }
  );
}

// Zapisuje pojedynczy ruch (append-only) i aktualizuje stan na obu końcach.
// Kolejność: najpierw nieusuwalny wpis do rejestru, potem $inc na quant –
// jeśli proces padnie pomiędzy, `recomputeQuants` odtworzy prawdę z rejestru.
export async function applyMove(db, move) {
  const itemCode = String(move.itemCode || '').trim();
  if (!itemCode) throw new Error('applyMove: brak itemCode');

  const quantity = Number(move.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('applyMove: quantity musi być liczbą > 0');
  }

  const fromLocationId = move.fromLocationId ? String(move.fromLocationId) : null;
  const toLocationId = move.toLocationId ? String(move.toLocationId) : null;
  if (!fromLocationId && !toLocationId) {
    throw new Error('applyMove: ruch musi mieć źródło lub cel');
  }
  if (fromLocationId && toLocationId && fromLocationId === toLocationId) {
    throw new Error('applyMove: źródło i cel nie mogą być takie same');
  }

  const lot = normalizeLot(move.lot);
  const doneAt = move.doneAt instanceof Date ? move.doneAt : new Date();

  const moveDoc = {
    itemCode,
    fromLocationId,
    toLocationId,
    quantity,
    lot,
    kind: move.kind || 'internal',
    state: 'done',
    operationId: move.operationId ? String(move.operationId) : null,
    actorEmail: move.actorEmail || null,
    note: String(move.note || ''),
    doneAt,
    createdAt: new Date()
  };

  const { insertedId } = await db.collection(collections.stockMoves).insertOne(moveDoc);

  if (fromLocationId) await adjustQuant(db, itemCode, fromLocationId, lot, -quantity);
  if (toLocationId) await adjustQuant(db, itemCode, toLocationId, lot, quantity);

  return { ...moveDoc, _id: insertedId };
}

// Odtwarza `quants` z rejestru ruchów. Dla pojedynczego towaru lub całości.
// To „źródło prawdy ostatniej instancji" – po migracji/awarii zawsze zgadza się z ruchami.
export async function recomputeQuants(db, itemCode = null) {
  const filter = itemCode ? { itemCode: String(itemCode) } : {};
  const acc = new Map();
  const affected = new Set();

  const cursor = db.collection(collections.stockMoves).find(filter);
  for await (const m of cursor) {
    affected.add(m.itemCode);
    const lot = m.lot ?? null;
    const qty = Number(m.quantity) || 0;

    if (m.fromLocationId) {
      const k = quantKey(m.itemCode, m.fromLocationId, lot);
      const prev = acc.get(k);
      if (prev) prev.quantity -= qty;
      else acc.set(k, { itemCode: m.itemCode, locationId: m.fromLocationId, lot, quantity: -qty });
    }
    if (m.toLocationId) {
      const k = quantKey(m.itemCode, m.toLocationId, lot);
      const prev = acc.get(k);
      if (prev) prev.quantity += qty;
      else acc.set(k, { itemCode: m.itemCode, locationId: m.toLocationId, lot, quantity: qty });
    }
  }

  const codes = itemCode ? [String(itemCode)] : [...affected];
  if (codes.length) {
    await db.collection(collections.quants).deleteMany({ itemCode: { $in: codes } });
  }

  const now = new Date();
  const docs = [...acc.values()]
    .filter(d => d.quantity !== 0)
    .map(d => ({ ...d, reservedQty: 0, updatedAt: now }));

  if (docs.length) {
    await db.collection(collections.quants).insertMany(docs);
  }

  return { items: codes.length, quants: docs.length };
}

// Synchronizuje pola-cache na `items` (currentLocation, quantity) ze stanem z `quants`,
// licząc tylko lokalizacje realne (internal/employee). Nie dotyka operationalStatus/
// assignedToEmail – te zostają w gestii dotychczasowych przepływów (do Fazy 2).
export async function refreshItemCache(db, itemCode) {
  const code = String(itemCode);
  const quants = await db.collection(collections.quants).find({ itemCode: code }).toArray();
  if (!quants.length) return null;

  const locIds = [...new Set(quants.map(q => q.locationId))]
    .map(toObjectIdOrNull)
    .filter(Boolean);
  const locs = await db.collection(collections.locations).find({ _id: { $in: locIds } }).toArray();
  const locById = new Map(locs.map(l => [String(l._id), l]));

  let total = 0;
  let best = null;
  for (const q of quants) {
    const loc = locById.get(q.locationId);
    if (!loc || !isStockableKind(loc.kind)) continue;
    total += q.quantity;
    if (!best || q.quantity > best.qty) best = { qty: q.quantity, name: loc.name };
  }

  const update = { quantity: total, updatedAt: new Date() };
  if (best) update.currentLocation = best.name;
  await db.collection(collections.items).updateOne({ itemCode: code }, { $set: update });
  return update;
}

// Sekwencyjny numer dokumentu operacji (np. WH/IN/00001). Użyte w Fazie 2.
export async function nextReference(db, prefix) {
  const res = await db.collection(collections.counters).findOneAndUpdate(
    { _id: `ref:${prefix}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const doc = res && res.value !== undefined ? res.value : res;
  const seq = doc && typeof doc.seq === 'number' ? doc.seq : 1;
  return `${prefix}/${String(seq).padStart(5, '0')}`;
}
