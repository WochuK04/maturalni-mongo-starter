import { collections } from '../schema.js';
import { PROVIDER, IDENTITY_TYPE, MFA, CRITICALITY, pickFromDict } from './access-dicts.js';
import { toObjectIdOrNull } from './ids.js';

// Tożsamości — konta, KTÓRYMI się logujemy. Właściciel osoby przez e-mail
// (spójnie z resztą aplikacji), podmiot (entity) przez ObjectId.
//
// TWARDE OGRANICZENIE BEZPIECZEŃSTWA: nigdy nie trzymamy sekretów. `backupCodesAt`
// opisuje LOKALIZACJĘ kodów zapasowych (np. „1Password › Zespół"), NIE kody.
// `recoveryPhoneSet` to sama FLAGA (czy ustawiono numer), nie numer telefonu.
// `recoveryEmail` to adres odzyskiwania (nie hasło). Nie dodawaj tu pól na sekrety.

export function identityView(i) {
  return {
    id: String(i._id),
    address: i.address || '',
    provider: i.provider || '',
    type: i.type || '',
    ownerEmail: i.ownerEmail || null,
    ownerName: i.ownerName || '',
    entityId: i.entityId ? String(i.entityId) : null,
    mfa: i.mfa || '',
    mfaEnforced: !!i.mfaEnforced,
    backupCodesAt: i.backupCodesAt || '',
    recoveryEmail: i.recoveryEmail || '',
    recoveryPhoneSet: !!i.recoveryPhoneSet,
    criticality: i.criticality || '',
    notes: i.notes || '',
    externalId: i.externalId || null
  };
}

// `db` potrzebne, by rozwiązać ownerName z ownerEmail (jak w licenses).
export async function identityDocFromBody(db, body, base = {}) {
  const doc = { ...base };
  if (body.address !== undefined) doc.address = String(body.address || '').trim();
  if (body.provider !== undefined) doc.provider = pickFromDict(PROVIDER, body.provider, '');
  if (body.type !== undefined) doc.type = pickFromDict(IDENTITY_TYPE, body.type, '');
  if (body.ownerEmail !== undefined) {
    const email = String(body.ownerEmail || '').trim().toLowerCase();
    doc.ownerEmail = email || null;
    if (email) {
      const u = await db.collection(collections.users).findOne({ email }, { projection: { fullName: 1 } });
      doc.ownerName = u?.fullName || email;
    } else doc.ownerName = '';
  }
  if (body.entityId !== undefined) doc.entityId = toObjectIdOrNull(body.entityId);
  if (body.mfa !== undefined) doc.mfa = pickFromDict(MFA, body.mfa, '');
  if (body.mfaEnforced !== undefined) doc.mfaEnforced = !!body.mfaEnforced;
  // Tylko lokalizacja kodów — nigdy same kody.
  if (body.backupCodesAt !== undefined) doc.backupCodesAt = String(body.backupCodesAt || '').trim();
  if (body.recoveryEmail !== undefined) doc.recoveryEmail = String(body.recoveryEmail || '').trim().toLowerCase();
  // Sama flaga — nigdy numer telefonu.
  if (body.recoveryPhoneSet !== undefined) doc.recoveryPhoneSet = !!body.recoveryPhoneSet;
  if (body.criticality !== undefined) doc.criticality = pickFromDict(CRITICALITY, body.criticality, '');
  if (body.notes !== undefined) doc.notes = String(body.notes || '').trim();
  if (body.externalId !== undefined) {
    const ext = String(body.externalId || '').trim();
    doc.externalId = ext || null;
  }
  return doc;
}
