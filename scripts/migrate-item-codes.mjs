// Migracja kodów produktów do formatu PREFIX-SUFFIX (np. legacy "G24" → "GADZ-MQQNNSKW").
//
// Reguły kodu są 1:1 z aplikacją: prefiks = pierwsze 4 znaki alfanumeryczne kategorii
// (Gadżet→GADZ, Towar→TOWA), sufiks = base36 z czasu. Rename wykonuje ta sama
// kaskada co edytor produktu (cascadeItemCodeRename) — przenosi kod po WSZYSTKICH
// kolekcjach (quanty, ruchy, konwersje, wypożyczenia, wnioski…).
//
// UŻYCIE:
//   1) DRY-RUN (domyślnie) — buduje plan i zapisuje CSV, NIC nie zmienia w bazie:
//        node scripts/migrate-item-codes.mjs
//        node scripts/migrate-item-codes.mjs --all         # także kategorie niemagazynowe
//        node scripts/migrate-item-codes.mjs --out plan.csv # inna ścieżka planu
//   2) Przejrzyj/edytuj wygenerowany plan CSV (kolumna newCode to źródło prawdy).
//   3) APPLY — wykonuje rename ściśle wg zatwierdzonego planu CSV:
//        node scripts/migrate-item-codes.mjs --apply --yes
//
// ŚRODOWISKO (jak aplikacja): MONGO_URI/MONGODB_URI + MONGO_DB_NAME/DB_NAME.
//   PROD = Atlas, baza `maturalni_equipment`. Skrypt wypisze host+bazę przed zapisem.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { connectToDatabase, closeDb } from '../src/db.js';
import { collections } from '../src/schema.js';
import { cascadeItemCodeRename } from '../src/stock.js';

const WAREHOUSE_ONLY_CATEGORIES = ['gadżet', 'opakowanie', 'sponsor', 'towar'];
const isWarehouseCategory = (c) => WAREHOUSE_ONLY_CATEGORIES.includes(String(c || '').trim().toLowerCase());

// --- kopie reguł z src/index.js (świadomie zduplikowane, by nie ruszać src) ---
function normalizeItemCode(v) { return String(v || '').trim().toUpperCase(); }
function itemCodePrefix(category) {
  return String(category || 'ZAK')
    .normalize('NFD').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'ZAK';
}

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const flagVal = (f, def) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const APPLY = hasFlag('--apply');
const YES = hasFlag('--yes');
const ALL = hasFlag('--all');
const PLAN_PATH = flagVal('--out', 'code-migration-plan.csv');

function csvEscape(v) { return `"${String(v == null ? '' : v).replace(/"/g, '""')}"`; }
function toCSV(rows) { return rows.map((r) => r.map(csvEscape).join(',')).join('\n'); }
// Parser CSV wystarczający dla naszego formatu (pola w cudzysłowach, escaping "").
function parseCSV(text) {
  const out = []; let row = [], field = '', inq = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inq) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inq = false; }
      else field += c;
    } else if (c === '"') inq = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; if (field !== '' || row.length) { row.push(field); out.push(row); row = []; field = ''; } }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  return out;
}

// Generator świeżego sufiksu base36 (jak app), z gwarancją unikalności w partii.
function makeSuffixFactory(taken) {
  let counter = 0;
  return () => {
    for (let i = 0; i < 50; i++) {
      const s = counter === 0 && i === 0
        ? Date.now().toString(36).toUpperCase()
        : `${Date.now().toString(36).toUpperCase()}${(counter * 50 + i).toString(36).toUpperCase()}`;
      counter++;
      if (!taken.has(s)) return s;
    }
    return `${Date.now()}${counter++}`;
  };
}

// Wyznacza docelowy kod (jak regenerateItemCodeForCategory): zachowaj sufiks gdy
// jest myślnik i tylko prefiks zły; legacy bez myślnika → świeży sufiks.
function proposeNewCode(oldCode, category, existing, nextSuffix) {
  const code = normalizeItemCode(oldCode);
  const prefix = itemCodePrefix(category);
  const dash = code.indexOf('-');
  let candidate;
  let reason;
  if (dash > 0) {
    if (code.slice(0, dash) === prefix) return null; // już poprawny — pomiń
    candidate = normalizeItemCode(`${prefix}-${code.slice(dash + 1)}`);
    reason = `zły prefiks (${code.slice(0, dash)}→${prefix})`;
  } else {
    candidate = normalizeItemCode(`${prefix}-${nextSuffix()}`);
    reason = 'legacy bez myślnika';
  }
  // unikalność
  while (existing.has(candidate)) { candidate = normalizeItemCode(`${prefix}-${nextSuffix()}`); }
  return { candidate, reason };
}

async function buildPlan(db) {
  const items = await db.collection(collections.items)
    .find({}, { projection: { itemCode: 1, name: 1, category: 1 } }).toArray();
  const existing = new Set(items.map((it) => normalizeItemCode(it.itemCode)));
  const suffixSeen = new Set();
  const nextSuffix = makeSuffixFactory(suffixSeen);
  const scope = items.filter((it) => ALL || isWarehouseCategory(it.category));
  const plan = [];
  for (const it of scope) {
    const res = proposeNewCode(it.itemCode, it.category, existing, () => { const s = nextSuffix(); suffixSeen.add(s); return s; });
    if (!res) continue;
    existing.add(res.candidate);
    plan.push({ oldCode: it.itemCode, name: it.name || '', category: it.category || '', newCode: res.candidate, reason: res.reason });
  }
  return { plan, total: items.length, scoped: scope.length };
}

async function runDryRun(db) {
  const { plan, total, scoped } = await buildPlan(db);
  const header = ['oldCode', 'name', 'category', 'newCode', 'reason'];
  const csv = toCSV([header, ...plan.map((p) => [p.oldCode, p.name, p.category, p.newCode, p.reason])]);
  writeFileSync(PLAN_PATH, '﻿' + csv, 'utf8');
  console.log(`\nDRY-RUN — nic nie zapisano w bazie.`);
  console.log(`Produktów w bazie: ${total} · w zakresie (${ALL ? 'wszystkie' : 'magazynowe'}): ${scoped}`);
  console.log(`Do migracji: ${plan.length}`);
  for (const p of plan.slice(0, 20)) console.log(`  ${p.oldCode.padEnd(16)} → ${p.newCode.padEnd(20)} [${p.category}] ${p.reason}`);
  if (plan.length > 20) console.log(`  … i ${plan.length - 20} więcej (pełna lista w pliku)`);
  console.log(`\nPlan zapisany: ${PLAN_PATH}`);
  console.log(`Przejrzyj/edytuj plik, potem: node scripts/migrate-item-codes.mjs --apply --yes\n`);
}

async function runApply(db) {
  if (!existsSync(PLAN_PATH)) { console.error(`Brak pliku planu: ${PLAN_PATH}. Uruchom najpierw dry-run.`); process.exit(1); }
  if (!YES) { console.error('APPLY wymaga dodatkowo flagi --yes (potwierdzenie zapisu do bazy).'); process.exit(1); }
  const rows = parseCSV(readFileSync(PLAN_PATH, 'utf8').replace(/^﻿/, ''));
  const [header, ...body] = rows;
  const idx = (name) => header.indexOf(name);
  const iOld = idx('oldCode'), iNew = idx('newCode');
  if (iOld < 0 || iNew < 0) { console.error('Plan CSV musi mieć kolumny oldCode i newCode.'); process.exit(1); }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
  const host = uri.replace(/\/\/[^@]*@/, '//***@').split('/')[2] || '(nieznany host)';
  const dbName = db.databaseName;
  const plan = body.map((r) => ({ oldCode: normalizeItemCode(r[iOld]), newCode: normalizeItemCode(r[iNew]) }))
    .filter((p) => p.oldCode && p.newCode && p.oldCode !== p.newCode);
  console.log(`\nAPPLY → host: ${host} · baza: ${dbName}`);
  console.log(`Zmian do wykonania: ${plan.length}\n`);

  let ok = 0, skip = 0, fail = 0;
  for (const p of plan) {
    const item = await db.collection(collections.items).findOne({ itemCode: p.oldCode });
    if (!item) { console.log(`  SKIP ${p.oldCode} — brak produktu`); skip++; continue; }
    const clash = await db.collection(collections.items).findOne({ itemCode: p.newCode, _id: { $ne: item._id } });
    if (clash) { console.log(`  SKIP ${p.oldCode} → ${p.newCode} — kod zajęty`); skip++; continue; }
    try {
      await db.collection(collections.items).updateOne({ _id: item._id }, { $set: { itemCode: p.newCode, updatedAt: new Date() } });
      await cascadeItemCodeRename(db, p.oldCode, p.newCode);
      await db.collection(collections.auditLogs).insertOne({
        actorEmail: 'script:migrate-item-codes', actionType: 'item_code_migrated', entityType: 'item',
        entityId: String(item._id), payload: { from: p.oldCode, to: p.newCode }, createdAt: new Date()
      });
      console.log(`  OK   ${p.oldCode} → ${p.newCode}`);
      ok++;
    } catch (e) { console.log(`  FAIL ${p.oldCode} → ${p.newCode}: ${e.message}`); fail++; }
  }
  console.log(`\nGotowe. OK: ${ok} · pominięto: ${skip} · błędy: ${fail}\n`);
}

(async () => {
  const db = await connectToDatabase();
  try {
    if (APPLY) await runApply(db); else await runDryRun(db);
  } finally { await closeDb(); }
})().catch((e) => { console.error(e); process.exit(1); });
