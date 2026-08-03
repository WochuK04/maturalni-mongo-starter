import { collections } from '../schema.js';
import { licenseView } from './licenses.js';
import { identityView } from './identities.js';
import { accessView } from './accesses.js';
import { ADMIN_ROLES, DEFAULT_FX_RATES, CURRENCY } from './access-dicts.js';
import { toObjectIdOrNull } from './ids.js';

// Zapytania modułu „Mapa dostępów". To one są właściwym testem, czy model jest
// poprawny — dlatego mieszkają osobno i są współdzielone przez trasy i pulpit.

const isCritical = (v) => String(v || '').trim().startsWith('1');

// Kursy walut → PLN. Kolekcja `settings` (dok. key:'fxRates') nadpisuje domyślne.
export async function getFxRates(db) {
  const doc = await db.collection(collections.settings).findOne({ key: 'fxRates' });
  const rates = { ...DEFAULT_FX_RATES };
  if (doc && doc.rates && typeof doc.rates === 'object') {
    for (const cur of CURRENCY) {
      const r = Number(doc.rates[cur]);
      if (r > 0) rates[cur] = r;
    }
  }
  return rates;
}

// (1) ZASIĘG AWARII — dla tożsamości: wszystkie licencje, które od niej zależą,
// plus wszystkie osoby mające do nich dostęp. Odpowiedź na „co przestanie działać,
// gdy padnie to konto".
export async function blastRadius(db, identityId) {
  const id = toObjectIdOrNull(identityId);
  if (!id) return null;
  const identity = await db.collection(collections.identities).findOne({ _id: id });
  if (!identity) return null;

  const now = new Date();
  const licenses = await db.collection(collections.licenses)
    .find({ identityId: id, isActive: { $ne: false } }).sort({ name: 1 }).toArray();
  const licenseIds = licenses.map(l => l._id);

  const accesses = licenseIds.length
    ? await db.collection(collections.accesses).find({ licenseId: { $in: licenseIds } }).toArray()
    : [];

  return {
    identity: identityView(identity),
    licenses: licenses.map(l => licenseView(l, now)),
    accesses: accesses.map(accessView),
    licenseCount: licenses.length,
    peopleCount: new Set(accesses.map(a => a.personEmail)).size
  };
}

// (2) OFFBOARDING (rozszerzenie) — dla osoby: aktywne dostępy + tożsamości, których
// jest właścicielem (wymagają PRZENIESIENIA własności, nie odebrania). Licencje,
// w których figuruje jako właściciel biznesowy, liczy już collectOffboardingHoldings.
export async function personAccessHoldings(db, email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return { accesses: [], ownedIdentities: [] };
  const [accesses, ownedIdentities] = await Promise.all([
    db.collection(collections.accesses)
      .find({ personEmail: em, status: { $ne: 'Odebrany' } }).toArray(),
    db.collection(collections.identities)
      .find({ ownerEmail: em }).sort({ address: 1 }).toArray()
  ]);
  return {
    accesses: accesses.map(accessView),
    ownedIdentities: ownedIdentities.map(identityView)
  };
}

// (3) BUS FACTOR — licencje krytyczne mające DOKŁADNIE JEDNĄ osobę z rolą
// Owner/Admin. Jedna osoba = ryzyko, że wraz z jej odejściem tracimy kontrolę.
export async function busFactor(db) {
  const now = new Date();
  const licenses = await db.collection(collections.licenses)
    .find({ isActive: { $ne: false } }).toArray();
  const critical = licenses.filter(l => isCritical(l.criticality) && l.status !== 'cancelled');
  if (!critical.length) return [];

  const ids = critical.map(l => l._id);
  const admins = await db.collection(collections.accesses)
    .find({ licenseId: { $in: ids }, role: { $in: ADMIN_ROLES } }).toArray();

  const byLicense = new Map();
  for (const a of admins) {
    const k = String(a.licenseId);
    if (!byLicense.has(k)) byLicense.set(k, []);
    byLicense.get(k).push(a);
  }

  return critical
    .map(l => ({ license: l, admins: byLicense.get(String(l._id)) || [] }))
    .filter(x => x.admins.length === 1)
    .map(x => ({
      license: licenseView(x.license, now),
      soleAdmin: { email: x.admins[0].personEmail, name: x.admins[0].personName || x.admins[0].personEmail, role: x.admins[0].role }
    }));
}

// (4) KOSZT ROCZNY — suma po walutach + przelicznik na PLN (kursy z konfiguracji).
export async function annualCost(db) {
  const now = new Date();
  const rates = await getFxRates(db);
  const licenses = await db.collection(collections.licenses)
    .find({ isActive: { $ne: false } }).toArray();
  const live = licenses.map(l => licenseView(l, now)).filter(v => v.status !== 'cancelled');

  const byCurrency = {};
  let totalPln = 0;
  for (const v of live) {
    const cur = v.currency || 'PLN';
    byCurrency[cur] = byCurrency[cur] || { yearly: 0, count: 0 };
    byCurrency[cur].yearly = Math.round((byCurrency[cur].yearly + v.yearlyCost) * 100) / 100;
    byCurrency[cur].count += 1;
    totalPln += v.yearlyCost * (rates[cur] || 1);
  }
  return {
    rates,
    byCurrency,
    yearlyTotalPln: Math.round(totalPln * 100) / 100
  };
}

// Pozytywne metody MFA (potwierdzone drugie składniki). Wszystko inne — puste,
// „Brak", „Nie wiem" — traktujemy jako „bez MFA" przy liczeniu ryzyka.
const POSITIVE_MFA = new Set(['Aplikacja TOTP', 'Klucz sprzętowy', 'Passkey', 'SMS', 'E-mail']);

// Kafle pulpitu „Mapy dostępów": 3 nowe liczniki ryzyka + koszt roczny (PLN).
export async function accessMapSummary(db) {
  const [licenses, accessesToRevoke, cost] = await Promise.all([
    db.collection(collections.licenses).find({ isActive: { $ne: false } }).toArray(),
    db.collection(collections.accesses).countDocuments({ status: 'Do odebrania' }),
    annualCost(db)
  ]);
  const live = licenses.filter(l => l.status !== 'cancelled');
  const licensesWithoutIdentity = live.filter(l => !l.identityId).length;
  const criticalWithoutMfa = live.filter(l => isCritical(l.criticality) && !POSITIVE_MFA.has(l.mfa)).length;
  return {
    licensesWithoutIdentity,
    accessesToRevoke,
    criticalWithoutMfa,
    yearlyTotalPln: cost.yearlyTotalPln,
    monthlyTotalPln: Math.round((cost.yearlyTotalPln / 12) * 100) / 100,
    byCurrency: cost.byCurrency,
    rates: cost.rates
  };
}

// (5) SIEROTY — licencje bez właściciela biznesowego oraz bez tożsamości.
export async function orphans(db) {
  const now = new Date();
  const licenses = await db.collection(collections.licenses)
    .find({ isActive: { $ne: false } }).toArray();
  const views = licenses.map(l => licenseView(l, now));
  return {
    withoutOwner: views.filter(v => !v.ownerEmail),
    withoutIdentity: views.filter(v => !v.identityId)
  };
}
