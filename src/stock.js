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

// Sekwencyjny numer dokumentu operacji (np. mag/IN/00001).
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

// ===== Operacje magazynowe (Faza 2 – układ jak w Odoo) =====
//
// Każda operacja to dokument (`stockOperations`) z obiegiem stanów:
//   draft (Wersja robocza) -> ready (Gotowe) -> done (Wykonano).
// Zatwierdzenie (validateOperation) zamienia pozycje dokumentu na ruchy w rejestrze.
//
// Typy = grupy z menu „Operacje": Przekazy (receipt/delivery/internal),
// Korekty (scrap/adjustment). Domyślne lokalizacje to kody z drzewa (STANDARD_LOCATIONS).
export const OPERATION_TYPES = {
  receipt:    { label: 'Przyjęcie',             group: 'Przekazy', prefix: 'mag/IN',    defaultFrom: 'VIRT/Suppliers', defaultTo: 'WH/Stock' },
  delivery:   { label: 'Dostawa',               group: 'Przekazy', prefix: 'mag/OUT',   defaultFrom: 'WH/Stock',       defaultTo: 'WH/Employees' },
  internal:   { label: 'Przesunięcie wewnętrzne', group: 'Przekazy', prefix: 'mag/INT', defaultFrom: 'WH/Stock',       defaultTo: 'WH/Studio' },
  scrap:      { label: 'Odpad',                 group: 'Korekty',  prefix: 'mag/SCRAP', defaultFrom: 'WH/Stock',       defaultTo: 'VIRT/Scrap' },
  adjustment: { label: 'Inwentarz fizyczny',    group: 'Korekty',  prefix: 'mag/ADJ',   defaultFrom: null,             defaultTo: 'WH/Stock' }
};

export function isOperationType(type) {
  return Object.prototype.hasOwnProperty.call(OPERATION_TYPES, type);
}

// Stan danej sztuki na konkretnej lokalizacji (z materializowanych quantów).
export async function onHandAt(db, itemCode, locationId, lot = null) {
  const q = await db.collection(collections.quants).findOne({
    itemCode: String(itemCode),
    locationId: String(locationId),
    lot: lot ?? null
  });
  return q ? q.quantity : 0;
}

async function locationByCode(db, code) {
  return db.collection(collections.locations).findOne({ code });
}

// Zatwierdza operację: generuje ruchy z pozycji dokumentu i ustawia stan „done".
// Dla inwentaryzacji liczy różnicę (policzone − stan systemowy) i koryguje przez
// wirtualną lokalizację „Korekta stanu". Dla przekazów/odpadu sprawdza dostępność
// na lokalizacji fizycznej, by nie zejść poniżej zera.
export async function validateOperation(db, operationId, actorEmail) {
  const ops = db.collection(collections.stockOperations);
  const op = await ops.findOne({ _id: new ObjectId(String(operationId)) });
  if (!op) throw new Error('Operacja nie istnieje');
  if (op.state === 'done') throw new Error('Operacja jest już wykonana');
  if (op.state === 'cancelled') throw new Error('Operacja anulowana — nie można zatwierdzić');

  const lines = Array.isArray(op.lines) ? op.lines : [];
  if (!lines.length) throw new Error('Operacja nie ma pozycji');

  const now = new Date();
  const affected = new Set();

  // Przyjęcie: zapamiętaj stan/partie sprzed ruchów, by ochronić istniejącą ilość
  // przy dopisywaniu partii cenowych (patrz applyReceiptPriceBatches).
  const preReceipt = new Map();
  if (op.type === 'receipt') {
    const codes = [...new Set(lines.map(l => String(l.itemCode)))];
    const its = codes.length
      ? await db.collection(collections.items)
          .find({ itemCode: { $in: codes } }, { projection: { itemCode: 1, quantity: 1, priceBatches: 1 } })
          .toArray()
      : [];
    for (const it of its) preReceipt.set(it.itemCode, {
      quantity: Number(it.quantity) || 0,
      hadBatches: Array.isArray(it.priceBatches) && it.priceBatches.length > 0
    });
  }

  if (op.type === 'adjustment') {
    const inv = await locationByCode(db, 'VIRT/Inventory');
    if (!inv) throw new Error('Brak wirtualnej lokalizacji korekty (VIRT/Inventory)');

    for (const ln of lines) {
      const itemCode = String(ln.itemCode || '').trim();
      const locationId = String(ln.locationId || op.toLocationId || '');
      if (!itemCode || !locationId) throw new Error('Pozycja inwentarza bez sprzętu/lokalizacji');
      const lot = ln.lot != null && ln.lot !== '' ? String(ln.lot) : null;
      const counted = Number(ln.countedQty);
      if (!Number.isFinite(counted) || counted < 0) throw new Error(`Niepoprawny policzony stan dla ${itemCode}`);

      const theoretical = await onHandAt(db, itemCode, locationId, lot);
      const diff = counted - theoretical;
      if (diff === 0) continue;

      await applyMove(db, {
        itemCode,
        fromLocationId: diff > 0 ? String(inv._id) : locationId,
        toLocationId: diff > 0 ? locationId : String(inv._id),
        quantity: Math.abs(diff),
        lot,
        kind: 'adjustment',
        operationId: String(op._id),
        actorEmail,
        note: op.reference,
        doneAt: now
      });
      affected.add(itemCode);
    }
  } else {
    const from = op.fromLocationId ? String(op.fromLocationId) : null;
    const to = op.toLocationId ? String(op.toLocationId) : null;

    // Kontrola dostępności, gdy źródłem jest lokalizacja fizyczna (nie dotyczy przyjęć).
    if (from) {
      const fromLoc = await db.collection(collections.locations).findOne({ _id: new ObjectId(from) });
      if (fromLoc && isStockableKind(fromLoc.kind)) {
        for (const ln of lines) {
          const lot = ln.lot != null && ln.lot !== '' ? String(ln.lot) : null;
          const avail = await onHandAt(db, ln.itemCode, from, lot);
          if (Number(ln.quantity) > avail) {
            throw new Error(`Za mało na stanie: ${ln.itemCode} (dostępne ${avail}, żądane ${ln.quantity})`);
          }
        }
      }
    }

    for (const ln of lines) {
      const qty = Number(ln.quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Niepoprawna ilość dla ${ln.itemCode}`);
      await applyMove(db, {
        itemCode: ln.itemCode,
        fromLocationId: from,
        toLocationId: to,
        quantity: qty,
        lot: ln.lot != null && ln.lot !== '' ? String(ln.lot) : null,
        kind: op.type,
        operationId: String(op._id),
        actorEmail,
        note: op.reference,
        doneAt: now
      });
      affected.add(ln.itemCode);
    }
  }

  await ops.updateOne(
    { _id: op._id },
    { $set: { state: 'done', doneAt: now, doneByEmail: actorEmail, updatedAt: now } }
  );
  for (const code of affected) await refreshItemCache(db, code);

  // Przyjęcie z ceną → dopisz partie cenowe (po odświeżeniu cache, by nadpisać
  // ilość sumą partii — partie są źródłem prawdy dla produktów Magazynu, #27).
  if (op.type === 'receipt') await applyReceiptPriceBatches(db, op, lines, preReceipt, now);

  return { reference: op.reference, affected: [...affected] };
}

// Dopisuje partie cenowe do produktów z pozycji przyjęcia i ustawia ilość = suma
// partii. Jeśli produkt miał ilość, ale nie miał partii, najpierw dopisuje partię
// „Stan początkowy" (0 zł), żeby suma partii odzwierciedlała pełny stan.
async function applyReceiptPriceBatches(db, op, lines, preReceipt, now) {
  const byCode = new Map();
  for (const ln of lines) {
    const code = String(ln.itemCode);
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push({
      qty: Math.max(0, Math.floor(Number(ln.quantity) || 0)),
      unitPrice: Math.max(0, Math.round((Number(ln.unitPrice) || 0) * 100) / 100)
    });
  }

  const noteBase = op.supplierName ? `${op.reference} · ${op.supplierName}` : op.reference;

  for (const [code, entries] of byCode) {
    const item = await db.collection(collections.items)
      .findOne({ itemCode: code }, { projection: { priceBatches: 1 } });
    if (!item) continue;
    const batches = Array.isArray(item.priceBatches) ? item.priceBatches.slice() : [];
    const pre = preReceipt.get(code) || { quantity: 0, hadBatches: batches.length > 0 };

    if (!pre.hadBatches && batches.length === 0 && pre.quantity > 0) {
      batches.push({ qty: pre.quantity, unitPrice: 0, note: 'Stan początkowy', addedAt: now });
    }
    for (const e of entries) {
      if (e.qty <= 0 && e.unitPrice <= 0) continue;
      batches.push({ qty: e.qty, unitPrice: e.unitPrice, note: noteBase, addedAt: now });
    }

    const totalQty = batches.reduce((s, b) => s + (Number(b.qty) || 0), 0);
    await db.collection(collections.items).updateOne(
      { itemCode: code },
      { $set: { priceBatches: batches, quantity: totalQty, updatedAt: now } }
    );
  }
}

// ===== Zapotrzebowanie (reguły min-max / orderpoint) =====
//
// Jak w Odoo „Replenishment": reguła trzyma minimum i maksimum dla celu
// (kategoria albo konkretny itemCode). Gdy dostępny stan spadnie poniżej
// minimum, sugerujemy uzupełnienie do maksimum (do zamówienia = max − stan).
// „Dostępny stan" liczymy tylko na lokalizacjach realnego magazynu (`internal`):
// sprzęt u pracownika jest wydany, a lokalizacje wirtualne to źródła/ujścia.
export const REORDER_SCOPES = ['category', 'item'];

export function isReorderScope(scope) {
  return REORDER_SCOPES.includes(scope);
}

// Dostępny stan na lokalizacjach `internal`, zgrupowany per itemCode i per kategoria.
async function availableOnHand(db) {
  const internal = await db.collection(collections.locations)
    .find({ kind: LOCATION_KINDS.INTERNAL, isActive: { $ne: false } })
    .toArray();
  const internalIds = new Set(internal.map(l => String(l._id)));

  const quants = await db.collection(collections.quants)
    .find({ quantity: { $gt: 0 } })
    .toArray();

  const byItem = new Map();
  for (const q of quants) {
    if (!internalIds.has(q.locationId)) continue;
    byItem.set(q.itemCode, (byItem.get(q.itemCode) || 0) + q.quantity);
  }

  const codes = [...byItem.keys()];
  const items = codes.length
    ? await db.collection(collections.items)
        .find({ itemCode: { $in: codes } }, { projection: { itemCode: 1, category: 1 } })
        .toArray()
    : [];
  const catByCode = new Map(items.map(it => [it.itemCode, it.category || '']));

  const byCategory = new Map();
  for (const [code, qty] of byItem) {
    const cat = catByCode.get(code) || '';
    byCategory.set(cat, (byCategory.get(cat) || 0) + qty);
  }

  return { byItem, byCategory };
}

// Zwraca wszystkie reguły wzbogacone o bieżący stan i sugestię zamówienia.
export async function computeReplenishment(db) {
  const rules = await db.collection(collections.reorderRules)
    .find({}).sort({ scope: 1, target: 1 }).toArray();
  if (!rules.length) return [];

  const { byItem, byCategory } = await availableOnHand(db);

  // Nazwy dla reguł itemowych (czytelna etykieta „K004 · Sony A7").
  const itemCodes = rules.filter(r => r.scope === 'item').map(r => r.target);
  const items = itemCodes.length
    ? await db.collection(collections.items)
        .find({ itemCode: { $in: itemCodes } }, { projection: { itemCode: 1, name: 1 } })
        .toArray()
    : [];
  const nameByCode = new Map(items.map(it => [it.itemCode, it.name || '']));

  return rules.map(r => {
    const onHand = r.scope === 'item'
      ? (byItem.get(r.target) || 0)
      : (byCategory.get(r.target) || 0);
    const minQty = Number(r.minQty) || 0;
    const maxQty = Number(r.maxQty) || 0;
    const isActive = r.isActive !== false;
    const below = isActive && onHand < minQty;
    const toOrder = below ? Math.max(0, maxQty - onHand) : 0;
    const itemName = r.scope === 'item' ? (nameByCode.get(r.target) || '') : '';
    return {
      id: String(r._id),
      scope: r.scope,
      target: r.target,
      itemName,
      label: r.scope === 'item' ? (itemName || r.target) : r.target,
      minQty,
      maxQty,
      onHand,
      toOrder,
      below,
      isActive,
      note: r.note || ''
    };
  });
}
