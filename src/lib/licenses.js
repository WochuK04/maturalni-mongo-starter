import { collections } from '../schema.js';
import { CATEGORY, LOGIN_METHOD, CRITICALITY, MFA, CURRENCY, pickFromDict } from './access-dicts.js';
import { toObjectIdOrNull } from './ids.js';

// Logika domenowa licencji — współdzielona między trasami (src/routes/licenses.js)
// a Pulpitem alertów (/admin/alerts w index.js), dlatego mieszka w osobnym module.
//
// UWAGA bezpieczeństwo: NIE przechowujemy haseł — tylko login, URL panelu i
// notatkę „gdzie jest hasło" (np. 1Password). Odczyt: kierownik/admin. Zapis: admin.
export const LICENSE_STATUSES = ['active', 'trial', 'cancelled'];
export const DAY_MS_LIC = 24 * 60 * 60 * 1000;

export function normalizeAssigned(v) {
  const arr = Array.isArray(v) ? v : String(v || '').split(',');
  return arr.map(x => String(x || '').trim()).filter(Boolean).slice(0, 100);
}

export function licenseView(l, now = new Date()) {
  const amount = Math.max(0, Number(l.costAmount) || 0);
  const cycle = l.costCycle === 'yearly' ? 'yearly' : 'monthly';
  const monthlyCost = cycle === 'yearly' ? Math.round((amount / 12) * 100) / 100 : amount;
  const yearlyCost = cycle === 'yearly' ? amount : Math.round(amount * 12 * 100) / 100;
  const renewal = l.renewalDate ? new Date(l.renewalDate) : null;
  const daysToRenewal = renewal && !Number.isNaN(renewal.getTime())
    ? Math.floor((renewal.getTime() - now.getTime()) / DAY_MS_LIC) : null;
  return {
    id: String(l._id),
    name: l.name || '',
    vendor: l.vendor || '',
    category: l.category || '',
    costAmount: amount,
    costCycle: cycle,
    monthlyCost,
    yearlyCost,
    seats: l.seats == null ? null : Math.max(0, Number(l.seats) || 0),
    renewalDate: l.renewalDate || null,
    daysToRenewal,
    status: LICENSE_STATUSES.includes(l.status) ? l.status : 'active',
    ownerEmail: l.ownerEmail || null,
    ownerName: l.ownerName || '',
    assignedTo: Array.isArray(l.assignedTo) ? l.assignedTo : [],
    loginUsername: l.loginUsername || '',
    panelUrl: l.panelUrl || '',
    passwordLocation: l.passwordLocation || '',
    notes: l.notes || '',
    // === Mapa dostępów ===
    identityId: l.identityId ? String(l.identityId) : null,
    entityId: l.entityId ? String(l.entityId) : null,
    loginMethod: l.loginMethod || '',
    criticality: l.criticality || '',
    mfa: l.mfa || '',
    currency: CURRENCY.includes(l.currency) ? l.currency : 'PLN',
    seatsUsed: l.seatsUsed == null ? null : Math.max(0, Number(l.seatsUsed) || 0),
    externalId: l.externalId || null
  };
}

// Buduje dokument licencji z body (create/patch współdzielą walidację pól).
export async function licenseDocFromBody(db, body, base = {}) {
  const doc = { ...base };
  if (body.name !== undefined) doc.name = String(body.name || '').trim();
  if (body.vendor !== undefined) doc.vendor = String(body.vendor || '').trim();
  // Kategoria: słownik (patrz access-dicts). Zachowujemy jednak stare, niesłownikowe
  // wartości (fallback do surowej), żeby migracja UI na select nie wyzerowała danych.
  if (body.category !== undefined) {
    const raw = String(body.category || '').trim();
    doc.category = pickFromDict(CATEGORY, raw, raw);
  }
  if (body.costAmount !== undefined) doc.costAmount = Math.max(0, Number(body.costAmount) || 0);
  if (body.costCycle !== undefined) doc.costCycle = body.costCycle === 'yearly' ? 'yearly' : 'monthly';
  if (body.seats !== undefined) doc.seats = body.seats === '' || body.seats == null ? null : Math.max(0, Number(body.seats) || 0);
  if (body.renewalDate !== undefined) doc.renewalDate = body.renewalDate ? String(body.renewalDate) : null;
  if (body.status !== undefined) doc.status = LICENSE_STATUSES.includes(body.status) ? body.status : 'active';
  if (body.ownerEmail !== undefined) {
    const email = String(body.ownerEmail || '').trim().toLowerCase();
    doc.ownerEmail = email || null;
    if (email) {
      const u = await db.collection(collections.users).findOne({ email }, { projection: { fullName: 1 } });
      doc.ownerName = u?.fullName || email;
    } else doc.ownerName = '';
  }
  if (body.assignedTo !== undefined) doc.assignedTo = normalizeAssigned(body.assignedTo);
  if (body.loginUsername !== undefined) doc.loginUsername = String(body.loginUsername || '').trim();
  if (body.panelUrl !== undefined) doc.panelUrl = String(body.panelUrl || '').trim();
  if (body.passwordLocation !== undefined) doc.passwordLocation = String(body.passwordLocation || '').trim();
  if (body.notes !== undefined) doc.notes = String(body.notes || '').trim();
  // === Mapa dostępów ===
  // Referencje przez identyfikator (nie nazwę) — przetrwają zmianę nazwy konta/marki.
  if (body.identityId !== undefined) doc.identityId = toObjectIdOrNull(body.identityId);
  if (body.entityId !== undefined) doc.entityId = toObjectIdOrNull(body.entityId);
  if (body.loginMethod !== undefined) doc.loginMethod = pickFromDict(LOGIN_METHOD, body.loginMethod, '');
  if (body.criticality !== undefined) doc.criticality = pickFromDict(CRITICALITY, body.criticality, '');
  if (body.mfa !== undefined) doc.mfa = pickFromDict(MFA, body.mfa, '');
  if (body.currency !== undefined) doc.currency = CURRENCY.includes(body.currency) ? body.currency : 'PLN';
  if (body.seatsUsed !== undefined) doc.seatsUsed = body.seatsUsed === '' || body.seatsUsed == null ? null : Math.max(0, Number(body.seatsUsed) || 0);
  if (body.externalId !== undefined) {
    const ext = String(body.externalId || '').trim();
    doc.externalId = ext || null;
  }
  return doc;
}
