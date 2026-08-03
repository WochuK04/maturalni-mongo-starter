// Podmioty / marki (maturalni.com, korki.pl, …) — właściciel biznesowy licencji
// i „tenant" tożsamości. Wzorzec (view + docFromBody) jak w src/lib/licenses.js.

export function entityView(e) {
  return {
    id: String(e._id),
    name: e.name || '',
    domain: e.domain || '',
    type: e.type || '',
    externalId: e.externalId || null
  };
}

export function entityDocFromBody(body, base = {}) {
  const doc = { ...base };
  if (body.name !== undefined) doc.name = String(body.name || '').trim();
  if (body.domain !== undefined) doc.domain = String(body.domain || '').trim();
  if (body.type !== undefined) doc.type = String(body.type || '').trim();
  if (body.externalId !== undefined) {
    const ext = String(body.externalId || '').trim();
    doc.externalId = ext || null;
  }
  return doc;
}
