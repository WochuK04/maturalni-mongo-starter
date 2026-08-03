import { ObjectId } from 'mongodb';

// Zamienia wartość na ObjectId albo null (puste / niepoprawne → null). Używane do
// pól-referencji (identityId, entityId, licenseId). Referujemy przez identyfikator,
// nie przez nazwę — powiązanie ma przetrwać zmianę nazwy konta / marki / usługi.
export function toObjectIdOrNull(v) {
  if (!v) return null;
  if (v instanceof ObjectId) return v;
  try { return new ObjectId(String(v)); } catch { return null; }
}
