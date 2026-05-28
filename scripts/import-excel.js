import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const EXCEL_PATH = process.argv[2] || path.resolve(__dirname, '../Lista-sprzetu-Maturalni-2026-1.xlsx');
const SHEET_NAME_ARG = process.argv[3] || '';

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.mongodb_uri;

const DB_NAME =
  process.env.MONGO_DB_NAME ||
  process.env.DB_NAME ||
  'equipment_db';

if (!MONGO_URI) {
  console.error('Brak MONGO_URI / MONGODB_URI / mongodb_uri w .env');
  process.exit(1);
}

function s(v) {
  return String(v ?? '').trim();
}

function normalizeItemCode(v) {
  return s(v).toUpperCase();
}

function toInt(v, fallback = 1) {
  const m = String(v ?? '').match(/\d+/);
  return m ? Math.max(parseInt(m[0], 10), 1) : fallback;
}

function resolveSheetName(workbook, preferredName) {
  if (preferredName && workbook.Sheets[preferredName]) return preferredName;

  const candidates = ['ListaSprzetu', 'Lista_Sprzetu', 'Lista sprzętu', 'ListaSprzętu'];
  for (const name of candidates) {
    if (workbook.Sheets[name]) return name;
  }

  if (!workbook.SheetNames.length) {
    throw new Error('Plik Excel nie zawiera żadnych arkuszy');
  }

  return workbook.SheetNames[0];
}

function plStatusToOperationalStatus(row) {
  const location = s(row.Lokalizacja).toLowerCase();
  const statusPl = s(row.Status).toLowerCase();
  const person = s(row.Osoba);

  if (location === 'studio') return 'unavailable';
  if (location === 'u pracownika' || person) return 'loaned';
  if (statusPl.includes('wypo')) return 'loaned';
  if (statusPl.includes('niedost')) return 'unavailable';
  return 'available';
}

function isStudioLocked(row) {
  return s(row.Lokalizacja).toLowerCase() === 'studio';
}

function normalizeLocation(row) {
  return s(row.Lokalizacja) || 'Magazyn';
}

function normalizeCondition(row) {
  return s(row.Stan) || 'Nieznany';
}

function buildPayload(row, now, meta) {
  const itemCode = normalizeItemCode(row.ID);
  if (!itemCode) return null;

  const assignedToName = s(row.Osoba) || null;

  return {
    itemCode,
    category: s(row.Kategoria),
    name: s(row.Nazwa),
    details: s(row.Szczegy),
    quantity: toInt(row.Ilo, 1),
    currentLocation: normalizeLocation(row),
    conditionStatus: normalizeCondition(row),
    operationalStatus: plStatusToOperationalStatus(row),
    assignedToName,
    notes: s(row.Uwagi),
    isStudioLocked: isStudioLocked(row),
    isActive: true,
    importedFromExcelAt: now,
    importedFromExcelSheet: meta.sheetName,
    importedFromExcelFile: meta.excelPath,
    updatedAt: now
  };
}

async function runImport(itemsCol) {
  const resolvedExcelPath = path.resolve(process.cwd(), EXCEL_PATH);
  const wb = xlsx.readFile(resolvedExcelPath);
  const sheetName = resolveSheetName(wb, SHEET_NAME_ARG);
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  const now = new Date();

  const docs = rows
    .map(row => buildPayload(row, now, { sheetName, excelPath: resolvedExcelPath }))
    .filter(Boolean);

  const incomingCodes = docs.map(d => d.itemCode);

  const ops = docs.map(doc => {
    const setData = {
      category: doc.category,
      name: doc.name,
      details: doc.details,
      quantity: doc.quantity,
      currentLocation: doc.currentLocation,
      conditionStatus: doc.conditionStatus,
      operationalStatus: doc.operationalStatus,
      notes: doc.notes,
      isStudioLocked: doc.isStudioLocked,
      isActive: true,
      importedFromExcelAt: doc.importedFromExcelAt,
      importedFromExcelSheet: doc.importedFromExcelSheet,
      importedFromExcelFile: doc.importedFromExcelFile,
      updatedAt: doc.updatedAt
    };

    if (doc.assignedToName) {
      setData.assignedToName = doc.assignedToName;
    }

    return {
      updateOne: {
        filter: { itemCode: doc.itemCode },
        update: {
          $set: setData,
          $setOnInsert: {
            itemCode: doc.itemCode,
            assignedToEmail: null,
            imageUrl: '',
            thumbnailUrl: '',
            brand: '',
            model: '',
            qrCodeValue: doc.itemCode,
            tags: [],
            createdAt: now
          }
        },
        upsert: true
      }
    };
  });

  if (ops.length) {
    const result = await itemsCol.bulkWrite(ops, { ordered: false });
    console.log('import:', JSON.stringify({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    }));
  }

  const deactivate = await itemsCol.updateMany(
    { itemCode: { $nin: incomingCodes } },
    { $set: { isActive: false, updatedAt: now } }
  );

  console.log('deactivated:', JSON.stringify({
    matchedCount: deactivate.matchedCount,
    modifiedCount: deactivate.modifiedCount
  }));

  console.log(`Import OK. Wiersze: ${docs.length}, arkusz: ${sheetName}`);
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  try {
    const db = client.db(DB_NAME);
    const itemsCol = db.collection('items');
    await runImport(itemsCol);
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});