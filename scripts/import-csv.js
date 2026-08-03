// Import CSV dla „Mapy dostępów": entities / users / identities / licenses / accesses.
//
// IDEMPOTENTNY: dopasowanie po `externalId` (PD-01, OS-001, TZ-001, US-001, DS-001)
// z arkusza. Powtórne wgranie AKTUALIZUJE rekord, nie duplikuje. Referencje między
// kolekcjami podaje się przez externalId celu (nie przez nazwę):
//   identities.entityExternalId      → entityId
//   licenses.identityExternalId      → identityId
//   licenses.entityExternalId        → entityId
//   accesses.licenseExternalId       → licenseId   (+ personEmail wprost)
//
// KOLEJNOŚĆ importu (bo refy): entities → users → identities → licenses → accesses.
//
// Użycie:
//   node scripts/import-csv.js entities   data/entities.csv
//   node scripts/import-csv.js licenses   data/licenses.csv --dry-run
//
// Bezpieczeństwo: importer NIE przyjmuje pól-sekretów. Kolumny na hasło/kod/secret/
// token/klucz API są ignorowane (patrz IGNORED_SECRET_COLS).
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';
import { MongoClient } from 'mongodb';
import { collections, ensureIndexes } from '../src/schema.js';
import { seedAccessMapDefaults } from '../src/lib/access-seed.js';
import { entityDocFromBody } from '../src/lib/entities.js';
import { identityDocFromBody } from '../src/lib/identities.js';
import { licenseDocFromBody } from '../src/lib/licenses.js';
import { accessDocFromBody } from '../src/lib/accesses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.mongodb_uri;
const DB_NAME = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'equipment_db';

const TYPES = ['entities', 'users', 'identities', 'licenses', 'accesses'];
const IGNORED_SECRET_COLS = ['password', 'haslo', 'hasło', 'secret', 'sekret', 'token', 'apikey', 'api_key', 'klucz', 'backupcodes', 'totp'];

const args = process.argv.slice(2).filter(a => a !== '');
const DRY_RUN = args.includes('--dry-run');
const positional = args.filter(a => !a.startsWith('--'));
const TYPE = positional[0];
const FILE = positional[1];

if (!MONGO_URI) { console.error('Brak MONGO_URI / MONGODB_URI w .env'); process.exit(1); }
if (!TYPES.includes(TYPE) || !FILE) {
  console.error(`Użycie: node scripts/import-csv.js <${TYPES.join('|')}> <plik.csv> [--dry-run]`);
  process.exit(1);
}

const s = (v) => String(v ?? '').trim();

// Czyta CSV (xlsx radzi sobie z cudzysłowami/przecinkami) → tablica obiektów po nagłówkach.
function readCsvRows(file) {
  const wb = xlsx.readFile(path.resolve(process.cwd(), file), { raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(ws, { defval: '' });
}

// Buduje `body` z wiersza: kopiuje znane kolumny, pomija puste i kolumny-sekrety.
function bodyFromRow(row) {
  const body = {};
  for (const [k, v] of Object.entries(row)) {
    const key = s(k);
    if (!key) continue;
    if (IGNORED_SECRET_COLS.includes(key.toLowerCase())) continue;
    if (s(v) === '') continue;
    body[key] = v;
  }
  return body;
}

// Normalizuje wartości boolean z CSV („true/tak/1" → true).
function toBool(v) {
  return ['1', 'true', 'tak', 'yes', 'y', 'x'].includes(s(v).toLowerCase());
}

async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  await ensureIndexes(db);
  await seedAccessMapDefaults(db);

  // Mapy externalId → _id dla rozwiązywania referencji.
  const extMap = async (coll) => {
    const docs = await db.collection(coll).find({ externalId: { $ne: null } }, { projection: { externalId: 1 } }).toArray();
    return new Map(docs.map(d => [String(d.externalId), d._id]));
  };
  const entById = await extMap(collections.entities);
  const identById = await extMap(collections.identities);
  const licById = await extMap(collections.licenses);

  const rows = readCsvRows(FILE);
  const now = new Date();
  let inserted = 0, updated = 0;
  const unresolved = [];   // { externalId, ref, value }
  const coll = db.collection(collections[TYPE]);

  for (const [i, row] of rows.entries()) {
    const body = bodyFromRow(row);
    const externalId = s(body.externalId);
    let setDoc, natural;   // `natural` = filtr naturalnego klucza (poza externalId)

    if (TYPE === 'entities') {
      const name = s(body.name);
      if (!name) { console.warn(`Wiersz ${i + 2}: brak name — pomijam`); continue; }
      setDoc = entityDocFromBody(body, { updatedAt: now });
      natural = { name };

    } else if (TYPE === 'users') {
      const email = s(body.email).toLowerCase();
      if (!email) { console.warn(`Wiersz ${i + 2}: brak email — pomijam`); continue; }
      setDoc = { email, updatedAt: now };
      if (body.fullName !== undefined) setDoc.fullName = s(body.fullName);
      if (body.role !== undefined) setDoc.role = s(body.role) || 'user';
      if (body.managerEmail !== undefined) setDoc.managerEmail = s(body.managerEmail).toLowerCase() || null;
      if (externalId) setDoc.externalId = externalId;
      natural = { email };

    } else if (TYPE === 'identities') {
      const address = s(body.address);
      if (!address) { console.warn(`Wiersz ${i + 2}: brak address — pomijam`); continue; }
      if (body.entityExternalId !== undefined) {
        const ref = s(body.entityExternalId);
        const eid = entById.get(ref);
        if (eid) body.entityId = String(eid);
        else if (ref) unresolved.push({ externalId, ref: 'entity', value: ref });
        delete body.entityExternalId;
      }
      if (body.mfaEnforced !== undefined) body.mfaEnforced = toBool(body.mfaEnforced);
      if (body.recoveryPhoneSet !== undefined) body.recoveryPhoneSet = toBool(body.recoveryPhoneSet);
      setDoc = await identityDocFromBody(db, body, { updatedAt: now });
      natural = { address };

    } else if (TYPE === 'licenses') {
      const name = s(body.name);
      if (!name) { console.warn(`Wiersz ${i + 2}: brak name — pomijam`); continue; }
      for (const [col, map, refName, field] of [
        ['identityExternalId', identById, 'identity', 'identityId'],
        ['entityExternalId', entById, 'entity', 'entityId']
      ]) {
        if (body[col] !== undefined) {
          const ref = s(body[col]);
          const rid = map.get(ref);
          if (rid) body[field] = String(rid);
          else if (ref) unresolved.push({ externalId, ref: refName, value: ref });
          delete body[col];
        }
      }
      setDoc = await licenseDocFromBody(db, body, { updatedAt: now });
      natural = { name, isActive: { $ne: false } };

    } else if (TYPE === 'accesses') {
      const email = s(body.personEmail).toLowerCase();
      if (body.licenseExternalId !== undefined) {
        const ref = s(body.licenseExternalId);
        const lid = licById.get(ref);
        if (lid) body.licenseId = String(lid);
        else if (ref) unresolved.push({ externalId, ref: 'license', value: ref });
        delete body.licenseExternalId;
      }
      if (!email || !body.licenseId) { console.warn(`Wiersz ${i + 2}: brak personEmail lub nierozwiązana licencja — pomijam`); continue; }
      setDoc = await accessDocFromBody(db, body, { updatedAt: now });
      natural = { personEmail: email, licenseId: setDoc.licenseId };
    }

    if (DRY_RUN) { inserted++; continue; }

    // Dopasuj po externalId LUB naturalnym kluczu — to godzi rekordy z seeda (bez
    // externalId) z importem po externalId i gwarantuje idempotencję niezależnie od
    // tego, którym kluczem trafiliśmy. externalId ma priorytet.
    const existing = (externalId && await coll.findOne({ externalId })) || await coll.findOne(natural);
    if (existing) {
      await coll.updateOne({ _id: existing._id }, { $set: setDoc });
      updated++;
      if (TYPE === 'entities' && externalId) entById.set(externalId, existing._id);
      if (TYPE === 'identities' && externalId) identById.set(externalId, existing._id);
      if (TYPE === 'licenses' && externalId) licById.set(externalId, existing._id);
    } else {
      const insDoc = { ...setDoc, createdAt: now };
      if (TYPE === 'users' && insDoc.isActive === undefined) insDoc.isActive = true;
      const { insertedId } = await coll.insertOne(insDoc);
      inserted++;
      if (TYPE === 'entities' && externalId) entById.set(externalId, insertedId);
      if (TYPE === 'identities' && externalId) identById.set(externalId, insertedId);
      if (TYPE === 'licenses' && externalId) licById.set(externalId, insertedId);
    }
  }

  console.log(JSON.stringify({
    type: TYPE, dryRun: DRY_RUN, db: DB_NAME, file: FILE,
    rowsSeen: rows.length, inserted, updated, unresolvedRefs: unresolved.length
  }, null, 2));
  if (unresolved.length) {
    console.log('\nNierozwiązane referencje (cel jeszcze niezaimportowany?):');
    for (const u of unresolved) console.log(`  • [${u.externalId || '—'}] ${u.ref} = "${u.value}"`);
  }
  await client.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
