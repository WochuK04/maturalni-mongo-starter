// Słowniki modułu „Mapa dostępów" — JEDNO źródło prawdy dla walidacji (backend)
// i list wyboru w UI (public/v2). Zmiana wartości tutaj propaguje się wszędzie,
// dlatego nie duplikujemy tych list w routach ani w app.js.
//
// UWAGA bezpieczeństwo (patrz też src/lib/licenses.js): nigdzie w tym module NIE
// przechowujemy haseł, kodów zapasowych, sekretów TOTP ani kluczy API — tylko
// LOKALIZACJE tych sekretów i FLAGI ich istnienia.

export const PROVIDER = ['Google', 'Microsoft', 'Apple', 'GitHub', 'Facebook / Meta', 'SSO własne', 'E-mail + hasło', 'Inny'];
export const IDENTITY_TYPE = ['Osobowa', 'Współdzielona', 'Serwisowa / techniczna', 'Rola (alias)', 'Domena / tenant'];
export const MFA = ['Brak', 'Aplikacja TOTP', 'Klucz sprzętowy', 'Passkey', 'SMS', 'E-mail', 'Nie wiem'];
export const LOGIN_METHOD = ['Hasło', 'SSO Google', 'SSO Microsoft', 'SSO Apple', 'SSO GitHub', 'Passkey', 'Magic link', 'Klucz API', 'Nie wiem'];
export const CATEGORY = [
  'Poczta i produktywność', 'Marketing i social', 'Reklama płatna', 'Analityka',
  'Domena / DNS / hosting', 'Dev i infrastruktura', 'Design', 'Finanse i księgowość',
  'Płatności', 'HR i rekrutacja', 'Sprzedaż i CRM', 'Nauka / treści', 'AI i narzędzia',
  'Automatyzacja wewnętrzna', 'Inne'
];
export const CRITICALITY = ['1 – Krytyczna', '2 – Ważna', '3 – Pomocnicza'];
export const ACCESS_ROLE = ['Owner / Właściciel', 'Admin', 'Edytor', 'Członek', 'Tylko podgląd', 'Rozliczenia', 'Nie wiem'];
export const ACCESS_STATUS = ['Aktywny', 'Do odebrania', 'Do przeniesienia', 'Odebrany', 'Do weryfikacji'];
export const CURRENCY = ['PLN', 'EUR', 'USD', 'GBP'];

// Role dające „władzę" nad usługą — używane przez zapytanie „bus factor".
export const ADMIN_ROLES = ['Owner / Właściciel', 'Admin'];

// Domyślne kursy walut → PLN. Wartość startowa; realne kursy trzymamy w kolekcji
// `settings` (dok. `fxRates`) i tam je edytujemy — tu tylko fallback.
export const DEFAULT_FX_RATES = { PLN: 1, EUR: 4.3, USD: 4.0, GBP: 5.0 };

// Zwraca wartość ze słownika, jeśli poprawna; inaczej `fallback` (domyślnie null).
// Puste/undefined traktujemy jak „nie ustawiono" → fallback.
export function pickFromDict(dict, value, fallback = null) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return fallback;
  return dict.includes(v) ? v : fallback;
}
