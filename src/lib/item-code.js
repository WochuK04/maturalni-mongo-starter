// Kanoniczna postać kodu produktu (trim + wielkie litery). Współdzielone przez
// warehouse (index.js) i moduł wyjazdów (src/routes/turbo-weekends.js).
export function normalizeItemCode(value) {
  return String(value || '').trim().toUpperCase();
}
