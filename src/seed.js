import dotenv from 'dotenv';
import { connectToDatabase, closeDb } from './db.js';
import { collections, ensureIndexes } from './schema.js';
import { seedStandardLocations, applyMove, recomputeQuants, refreshItemCache } from './stock.js';

dotenv.config();

const now = new Date();

const users = [
  { email: 'admin@maturalni.com', fullName: 'Admin Maturalni', role: 'admin', isActive: true, createdAt: now },
  { email: 'daria.najberg@maturalni.com', fullName: 'Daria Najberg', role: 'user', isActive: true, createdAt: now },
  { email: 'sara.kosiarska@maturalni.com', fullName: 'Sara Kosiarska', role: 'user', isActive: true, createdAt: now }
];

const items = [
  {
    itemCode: 'L013',
    category: 'Lampy',
    name: 'Streamplify Light 10',
    details: '',
    quantity: 1,
    conditionStatus: 'very_good',
    operationalStatus: 'loaned',
    currentLocation: 'U pracownika',
    assignedToEmail: 'daria.najberg@maturalni.com',
    notes: '',
    isActive: true,
    createdAt: now,
    updatedAt: now
  },
  {
    itemCode: 'PC006',
    category: 'Laptop',
    name: 'Lenovo IdeaPad Slim 5',
    details: '',
    quantity: 1,
    conditionStatus: 'very_good',
    operationalStatus: 'loaned',
    currentLocation: 'U pracownika',
    assignedToEmail: 'sara.kosiarska@maturalni.com',
    notes: '',
    isActive: true,
    createdAt: now,
    updatedAt: now
  },
  {
    itemCode: 'M006',
    category: 'Monitory',
    name: 'Aputure V',
    details: 'Monitorek podglądowy',
    quantity: 1,
    conditionStatus: 'very_good',
    operationalStatus: 'available',
    currentLocation: 'Magazyn',
    assignedToEmail: null,
    notes: '',
    isActive: true,
    createdAt: now,
    updatedAt: now
  }
];

const loans = [
  {
    itemCode: 'L013',
    userEmail: 'daria.najberg@maturalni.com',
    quantity: 1,
    fromLocation: 'Magazyn',
    targetUseLocation: 'Dom',
    status: 'active',
    borrowedAt: now,
    dueAt: null,
    returnedAt: null,
    borrowNote: 'Wypożyczenie testowe',
    returnNote: null,
    createdByEmail: 'admin@maturalni.com',
    closedByEmail: null
  },
  {
    itemCode: 'PC006',
    userEmail: 'sara.kosiarska@maturalni.com',
    quantity: 1,
    fromLocation: 'Biuro',
    targetUseLocation: 'Biuro',
    status: 'active',
    borrowedAt: now,
    dueAt: null,
    returnedAt: null,
    borrowNote: 'Laptop przypisany do pracy',
    returnNote: null,
    createdByEmail: 'admin@maturalni.com',
    closedByEmail: null
  }
];

const auditLogs = [
  {
    actorEmail: 'admin@maturalni.com',
    actionType: 'loan_created',
    entityType: 'loan',
    entityId: 'L013',
    payload: { itemCode: 'L013', userEmail: 'daria.najberg@maturalni.com' },
    createdAt: now
  },
  {
    actorEmail: 'admin@maturalni.com',
    actionType: 'loan_created',
    entityType: 'loan',
    entityId: 'PC006',
    payload: { itemCode: 'PC006', userEmail: 'sara.kosiarska@maturalni.com' },
    createdAt: now
  }
];

async function run() {
  const db = await connectToDatabase();
  await ensureIndexes(db);

  await db.collection(collections.locations).deleteMany({});
  await db.collection(collections.users).deleteMany({});
  await db.collection(collections.items).deleteMany({});
  await db.collection(collections.loans).deleteMany({});
  await db.collection(collections.auditLogs).deleteMany({});
  await db.collection(collections.stockMoves).deleteMany({});
  await db.collection(collections.quants).deleteMany({});
  await db.collection(collections.warehouses).deleteMany({});
  await db.collection(collections.reorderRules).deleteMany({});
  await db.collection(collections.onboardingSteps).deleteMany({});

  // Drzewo lokalizacji „w stylu Odoo" (realne + wirtualne) zamiast płaskiej listy.
  const byCode = await seedStandardLocations(db);
  const byName = new Map();
  for (const loc of byCode.values()) byName.set(loc.name, loc);
  const inventoryLoc = byCode.get('VIRT/Inventory');

  await db.collection(collections.users).insertMany(users);
  await db.collection(collections.items).insertMany(items);
  await db.collection(collections.loans).insertMany(loans);
  await db.collection(collections.auditLogs).insertMany(auditLogs);

  // Stan otwarcia: ruch z wirtualnej „Korekta stanu" do bieżącej lokalizacji sprzętu.
  for (const it of items) {
    const loc = byName.get(it.currentLocation) || byName.get('Magazyn');
    await applyMove(db, {
      itemCode: it.itemCode,
      fromLocationId: String(inventoryLoc._id),
      toLocationId: String(loc._id),
      quantity: Number(it.quantity ?? 1) || 1,
      kind: 'opening',
      actorEmail: 'seed',
      note: 'Stan otwarcia (seed)'
    });
  }
  await recomputeQuants(db);
  for (const it of items) await refreshItemCache(db, it.itemCode);

  // Przykładowe reguły min-max (Zapotrzebowanie). Stan dostępny liczy się
  // tylko z lokalizacji „Magazyn" (internal), więc M006 (Magazyn) = 1 szt.,
  // a Lampy/Laptop są u pracowników → 0 dostępnych.
  await db.collection(collections.reorderRules).insertMany([
    { scope: 'category', target: 'Monitory', minQty: 3, maxQty: 6, note: 'Trzon zestawu podglądowego', isActive: true, createdByEmail: 'seed', createdAt: now, updatedAt: now },
    { scope: 'category', target: 'Lampy', minQty: 2, maxQty: 4, note: '', isActive: true, createdByEmail: 'seed', createdAt: now, updatedAt: now },
    { scope: 'item', target: 'M006', minQty: 1, maxQty: 2, note: '', isActive: true, createdByEmail: 'seed', createdAt: now, updatedAt: now }
  ]);

  // Domyślne kroki onboardingu — pogrupowane po kategoriach. Postęp każdego
  // użytkownika trzymany osobno (onboardingProgress), więc tu tylko szablon.
  const onboardingSteps = [
    // Konto i dostępy
    { title: 'Odbierz służbowy adres e-mail', description: 'Zaloguj się na konto @maturalni.com i ustaw hasło oraz weryfikację dwuetapową.', category: 'Konto i dostępy', url: '', sortOrder: 10 },
    { title: 'Dołącz do przestrzeni w Slacku', description: 'Zainstaluj Slacka i dołącz do kanałów #ogólny, #zaplecze i kanału swojego zespołu.', category: 'Konto i dostępy', url: '', sortOrder: 20 },
    { title: 'Uzupełnij profil w zapleczu', description: 'Sprawdź, czy imię, nazwisko i rola w panelu Zaplecze są poprawne.', category: 'Konto i dostępy', url: '/v2', sortOrder: 30 },
    // Sprzęt i narzędzia
    { title: 'Odbierz sprzęt na start', description: 'Zgłoś się po laptop i akcesoria, a następnie sprawdź, czy widzisz je w zakładce „Mój sprzęt”.', category: 'Sprzęt i narzędzia', url: '/v2', sortOrder: 40 },
    { title: 'Poznaj wypożyczanie sprzętu', description: 'Przejrzyj „Dostępny sprzęt” i wykonaj testowy wniosek o wypożyczenie.', category: 'Sprzęt i narzędzia', url: '/v2', sortOrder: 50 },
    { title: 'Zainstaluj podstawowe narzędzia', description: 'Zainstaluj pakiet biurowy, przeglądarkę roboczą i menedżer haseł zgodnie z instrukcją zespołu.', category: 'Sprzęt i narzędzia', url: '', sortOrder: 60 },
    // Wdrożenie
    { title: 'Przeczytaj przewodnik pracownika', description: 'Zapoznaj się z zasadami pracy, urlopów i rozliczeń.', category: 'Wdrożenie', url: '', sortOrder: 70 },
    { title: 'Spotkanie 1:1 z przełożonym', description: 'Umów pierwsze spotkanie wprowadzające i ustal cele na pierwszy miesiąc.', category: 'Wdrożenie', url: '', sortOrder: 80 },
    { title: 'Przejdź szkolenie BHP i RODO', description: 'Ukończ obowiązkowe szkolenia wstępne i potwierdź zapoznanie.', category: 'Wdrożenie', url: '', sortOrder: 90 },
    // Zespół i kultura
    { title: 'Poznaj zespół', description: 'Przedstaw się na kanale zespołu i umów krótkie kawy powitalne.', category: 'Zespół i kultura', url: '', sortOrder: 100 },
    { title: 'Dodaj się do kalendarza spotkań', description: 'Dołącz do cyklicznych spotkań zespołu i firmowych wydarzeń.', category: 'Zespół i kultura', url: '', sortOrder: 110 }
  ].map((s) => ({ ...s, isActive: true, createdByEmail: 'seed', createdAt: now, updatedAt: now }));
  await db.collection(collections.onboardingSteps).insertMany(onboardingSteps);

  console.log('Seed OK');
  await closeDb();
}

run().catch(async (err) => {
  console.error(err);
  await closeDb();
  process.exit(1);
});