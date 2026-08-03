import { collections } from '../schema.js';
import { ACCESS_ROLE, LOGIN_METHOD, ACCESS_STATUS, pickFromDict } from './access-dicts.js';
import { toObjectIdOrNull } from './ids.js';

// Dostępy — tabela łącząca osoba (e-mail) × licencja. Zastępuje pole „Używają".
// Osoba przez e-mail (spójnie z resztą aplikacji), licencja przez ObjectId.

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function accessView(a) {
  return {
    id: String(a._id),
    personEmail: a.personEmail || '',
    personName: a.personName || '',
    licenseId: a.licenseId ? String(a.licenseId) : null,
    licenseName: a.licenseName || '',
    role: a.role || '',
    loginMethod: a.loginMethod || '',
    grantedAt: a.grantedAt ? new Date(a.grantedAt).toISOString().slice(0, 10) : null,
    reviewedAt: a.reviewedAt ? new Date(a.reviewedAt).toISOString().slice(0, 10) : null,
    status: ACCESS_STATUS.includes(a.status) ? a.status : 'Do weryfikacji',
    offboardingAction: a.offboardingAction || '',
    notes: a.notes || '',
    externalId: a.externalId || null
  };
}

// Buduje dokument dostępu. `db` służy do rozwiązania nazwy osoby i licencji, żeby
// listy/tabele nie musiały dołączać (join) tych kolekcji przy każdym odczycie.
export async function accessDocFromBody(db, body, base = {}) {
  const doc = { ...base };
  if (body.personEmail !== undefined) {
    const email = String(body.personEmail || '').trim().toLowerCase();
    doc.personEmail = email;
    if (email) {
      const u = await db.collection(collections.users).findOne({ email }, { projection: { fullName: 1 } });
      doc.personName = u?.fullName || email;
    } else doc.personName = '';
  }
  if (body.licenseId !== undefined) {
    doc.licenseId = toObjectIdOrNull(body.licenseId);
    if (doc.licenseId) {
      const l = await db.collection(collections.licenses).findOne({ _id: doc.licenseId }, { projection: { name: 1 } });
      doc.licenseName = l?.name || '';
    } else doc.licenseName = '';
  }
  if (body.role !== undefined) doc.role = pickFromDict(ACCESS_ROLE, body.role, 'Nie wiem');
  if (body.loginMethod !== undefined) doc.loginMethod = pickFromDict(LOGIN_METHOD, body.loginMethod, '');
  if (body.grantedAt !== undefined) doc.grantedAt = toDateOrNull(body.grantedAt);
  if (body.reviewedAt !== undefined) doc.reviewedAt = toDateOrNull(body.reviewedAt);
  if (body.status !== undefined) doc.status = pickFromDict(ACCESS_STATUS, body.status, 'Do weryfikacji');
  if (body.offboardingAction !== undefined) doc.offboardingAction = String(body.offboardingAction || '').trim();
  if (body.notes !== undefined) doc.notes = String(body.notes || '').trim();
  if (body.externalId !== undefined) {
    const ext = String(body.externalId || '').trim();
    doc.externalId = ext || null;
  }
  return doc;
}
