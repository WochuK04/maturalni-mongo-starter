// Migracja kodów produktów — zmienia itemCode we WSZYSTKICH kolekcjach.
//
// Użycie:
//   node scripts/rename-product-codes.js
//
// Mapę zmian wpisujemy w RENAMES poniżej.
// Każdy wpis: 'STARY_KOD': 'NOWY_KOD'.
//
// Cel bazy bierze z .env (lokalnie localhost, na prodzie Atlas) — patrz src/db.js.

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

import { collections } from '../src/schema.js';
import { cascadeItemCodeRename } from '../src/stock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ===== MAPA ZMIAN — edytuj przed uruchomieniem =====
const RENAMES = {
  // 'G24': 'GADZ-MQQNNSKW',
  // 'T01': 'TOWA-ABCDEFGH',
};

async function main() {
  const entries = Object.entries(RENAMES);
  if (!entries.length) {
    console.log('Brak zmian do wykonania — wypełnij obiekt RENAMES w skrypcie.');
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'maturalni_equipment';
  console.log(`Łączenie z ${uri}, baza: ${dbName}`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  for (const [oldCode, newCode] of entries) {
    const item = await db.collection(collections.items).findOne({ itemCode: oldCode });
    if (!item) {
      console.log(`  POMINIĘTO: ${oldCode} — nie znaleziono w bazie`);
      continue;
    }

    const conflict = await db.collection(collections.items).findOne({ itemCode: newCode });
    if (conflict) {
      console.log(`  POMINIĘTO: ${oldCode} → ${newCode} — nowy kod już istnieje`);
      continue;
    }

    await db.collection(collections.items).updateOne(
      { itemCode: oldCode },
      { $set: { itemCode: newCode, updatedAt: new Date() } }
    );
    await cascadeItemCodeRename(db, oldCode, newCode);
    console.log(`  OK: ${oldCode} → ${newCode}`);
  }

  console.log('Gotowe.');
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
