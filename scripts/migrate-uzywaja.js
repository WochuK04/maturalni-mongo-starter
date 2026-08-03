// Migracja pola licenses.assignedTo[] („Używają") → kolekcja `accesses`.
//
// Zasada (patrz prompt „Mapa dostępów"):
//  - każdy wpis z assignedTo próbujemy dopasować do osoby (u nas: rekord `users`,
//    kluczowany e-mailem) — po e-mailu, po pełnym imieniu i nazwisku, albo przez
//    aliasy z person-email-map.js,
//  - dla TRAFIEŃ tworzymy dostęp ze statusem „Do weryfikacji" i rolą „Nie wiem",
//  - dla NIETRAFIONYCH nie zgadujemy — trafiają na raport końcowy,
//  - jest IDEMPOTENTNA: unikalny indeks {personEmail, licenseId} + upsert z
//    $setOnInsert → powtórne uruchomienie nic nie duplikuje i nie nadpisuje
//    ręcznych zmian,
//  - NIE kasuje pola assignedTo — zostaje jako źródło oryginalnego tekstu do czasu
//    ręcznej weryfikacji.
//
// Użycie:
//   node scripts/migrate-uzywaja.js            # zapis do bazy
//   node scripts/migrate-uzywaja.js --dry-run  # tylko podgląd + raport, bez zapisu
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { collections } from '../src/schema.js';
import { normalizePersonName, resolvePersonEmail } from '../src/person-email-map.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.mongodb_uri;
const DB_NAME = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'equipment_db';
const DRY_RUN = process.argv.includes('--dry-run');

if (!MONGO_URI) {
  console.error('Brak MONGO_URI / MONGODB_URI w .env');
  process.exit(1);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // Budujemy resolver osób z `users`: e-mail → e-mail oraz „imię nazwisko" → e-mail.
  const users = await db.collection(collections.users)
    .find({}, { projection: { email: 1, fullName: 1 } }).toArray();
  const userEmails = new Set(users.map(u => String(u.email || '').trim().toLowerCase()).filter(Boolean));
  const nameToEmail = new Map();
  for (const u of users) {
    const email = String(u.email || '').trim().toLowerCase();
    if (u.fullName && email) nameToEmail.set(normalizePersonName(u.fullName), email);
  }

  // Zwraca e-mail osoby albo null (nie zgadujemy). E-mail jest w tej aplikacji
  // identyfikatorem osoby, więc wpis-e-mail traktujemy jako trafienie.
  const resolvePerson = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (EMAIL_RE.test(s)) return s.toLowerCase();
    const norm = normalizePersonName(s);
    return nameToEmail.get(norm) || resolvePersonEmail(s) || null;
  };

  const licenses = await db.collection(collections.licenses)
    .find({ isActive: { $ne: false } }).toArray();

  const now = new Date();
  const unmatched = [];   // { licenseId, licenseName, entry }
  let entriesSeen = 0;
  let inserted = 0;
  let alreadyExisted = 0;
  let matchedEntries = 0;

  for (const lic of licenses) {
    const assigned = Array.isArray(lic.assignedTo) ? lic.assignedTo : [];
    // Dedup wpisów w obrębie jednej licencji (np. „Kinga" i „kinga").
    const seenPerLicense = new Set();
    for (const raw of assigned) {
      const entry = String(raw || '').trim();
      if (!entry) continue;
      entriesSeen++;
      const email = resolvePerson(entry);
      if (!email) {
        unmatched.push({ licenseId: String(lic._id), licenseName: lic.name || '', entry });
        continue;
      }
      matchedEntries++;
      if (seenPerLicense.has(email)) continue;
      seenPerLicense.add(email);

      if (DRY_RUN) { inserted++; continue; }

      const r = await db.collection(collections.accesses).updateOne(
        { personEmail: email, licenseId: lic._id },
        {
          $setOnInsert: {
            personEmail: email,
            licenseId: lic._id,
            role: 'Nie wiem',
            loginMethod: 'Nie wiem',
            status: 'Do weryfikacji',
            grantedAt: null,
            reviewedAt: null,
            offboardingAction: '',
            notes: `Zmigrowano z pola „Używają" (wpis: "${entry}").`,
            source: 'migration:uzywaja',
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true }
      );
      if (r.upsertedCount) inserted++; else alreadyExisted++;
    }
  }

  const report = {
    dryRun: DRY_RUN,
    db: DB_NAME,
    licensesScanned: licenses.length,
    entriesSeen,
    matchedEntries,
    accessesInserted: inserted,
    accessesAlreadyExisted: alreadyExisted,
    unmatchedCount: unmatched.length,
    unmatched
  };

  // Raport niedopasowań — trwały plik obok skryptu (nadpisywany przy re-runie).
  const reportPath = path.join(process.cwd(), 'scripts', 'migrate-uzywaja.report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({ ...report, unmatched: `${unmatched.length} pozycji → ${reportPath}` }, null, 2));
  if (unmatched.length) {
    console.log('\nNiedopasowane wpisy (pole „Używają" pozostaje nietknięte):');
    for (const u of unmatched) console.log(`  • [${u.licenseName}] „${u.entry}"`);
  }

  await client.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
