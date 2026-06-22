// Migracja „importu obecnego magazynu" do modelu w stylu Odoo (Faza 0).
//
// Co robi (idempotentnie – można puszczać wielokrotnie):
//   1. Zakłada indeksy i standardowe drzewo lokalizacji (realne + wirtualne).
//   2. Upsertuje jeden magazyn (WH).
//   3. Dla każdego AKTYWNEGO `items` tworzy „ruch otwarcia" z wirtualnej
//      lokalizacji Korekta stanu -> bieżąca lokalizacja (z items.currentLocation).
//   4. Przelicza `quants` z rejestru ruchów (źródło prawdy).
//   5. Synchronizuje cache (currentLocation/quantity) na items.
//
// Użycie:  node scripts/migrate-warehouse.js
// Cel bazy bierze z .env (lokalnie localhost, na prodzie Atlas) – patrz src/db.js.

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

import { collections, ensureIndexes } from '../src/schema.js';
import {
  seedStandardLocations,
  recomputeQuants,
  refreshItemCache,
  LOCATION_KINDS
} from '../src/stock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.mongodb_uri;
const DB_NAME = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'equipment_db';

if (!MONGO_URI) {
  console.error('Brak MONGO_URI / MONGODB_URI w .env');
  process.exit(1);
}

function itemQuantity(it) {
  const raw = Number(it.quantity ?? it.quantityTotal ?? 1);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.floor(raw);
}

async function getOrCreateInternal(db, byName, byCode, whRoot, rawName) {
  const name = (rawName || '').trim() || 'Magazyn';
  if (byName.has(name)) return byName.get(name);

  let slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '');
  if (!slug) slug = `Loc${byCode.size + 1}`;
  let code = `WH/${slug}`;
  let i = 1;
  while (byCode.has(code)) code = `WH/${slug}${i++}`;

  const ancestors = [...(whRoot.ancestors || []), whRoot.code];
  await db.collection(collections.locations).updateOne(
    { $or: [{ code }, { name }] },
    {
      $set: {
        code,
        name,
        kind: LOCATION_KINDS.INTERNAL,
        parentId: String(whRoot._id),
        ancestors,
        isActive: true,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  const saved = await db.collection(collections.locations).findOne({ code });
  byCode.set(code, saved);
  byName.set(name, saved);
  return saved;
}

async function run(db) {
  await ensureIndexes(db);

  // 1. Drzewo lokalizacji.
  const byCode = await seedStandardLocations(db);
  const byName = new Map();
  for (const loc of byCode.values()) byName.set(loc.name, loc);

  const whRoot = byCode.get('WH');
  const inventoryLoc = byCode.get('VIRT/Inventory');
  const stockLoc = byCode.get('WH/Stock');

  // 2. Magazyn.
  await db.collection(collections.warehouses).updateOne(
    { code: 'WH' },
    {
      $set: {
        code: 'WH',
        name: 'Magazyn główny',
        stockLocationId: String(stockLoc._id),
        viewLocationId: String(whRoot._id),
        isActive: true,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  // 3. Ruchy otwarcia z aktywnych items.
  const items = await db.collection(collections.items).find({ isActive: { $ne: false } }).toArray();
  const now = new Date();
  const openingMoves = [];

  for (const it of items) {
    const loc = await getOrCreateInternal(db, byName, byCode, whRoot, it.currentLocation);
    openingMoves.push({
      itemCode: it.itemCode,
      fromLocationId: String(inventoryLoc._id),
      toLocationId: String(loc._id),
      quantity: itemQuantity(it),
      lot: null, // śledzenie partii/serial – Faza 3
      kind: 'opening',
      state: 'done',
      operationId: null,
      actorEmail: 'migracja',
      note: 'Stan otwarcia (migracja z items.currentLocation)',
      doneAt: now,
      createdAt: now
    });
  }

  // Idempotencja: regenerujemy tylko ruchy otwarcia, realne ruchy (Faza 2+) zostają.
  const removed = await db.collection(collections.stockMoves).deleteMany({ kind: 'opening' });
  if (openingMoves.length) {
    await db.collection(collections.stockMoves).insertMany(openingMoves);
  }

  // 4. Przelicz stan z rejestru.
  const recomputed = await recomputeQuants(db);

  // 5. Zsynchronizuj cache na items i sprawdź rozjazdy currentLocation.
  let cacheSynced = 0;
  let locationDrift = 0;
  for (const it of items) {
    const before = it.currentLocation;
    const res = await refreshItemCache(db, it.itemCode);
    if (res) {
      cacheSynced += 1;
      if (res.currentLocation && res.currentLocation !== before) locationDrift += 1;
    }
  }

  console.log('Migracja magazynu OK:');
  console.log(JSON.stringify({
    locations: byCode.size,
    items: items.length,
    openingMovesRemoved: removed.deletedCount,
    openingMovesInserted: openingMoves.length,
    quants: recomputed.quants,
    cacheSynced,
    locationDrift
  }, null, 2));
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  try {
    await run(client.db(DB_NAME));
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
