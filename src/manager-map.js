// Mapa: pracownik (email) -> kierownik działu (email), do którego najpierw
// trafia jego wniosek o wypożyczenie. Wnioski osób spoza mapy idą wprost do
// administracji (etap pending_admin).
export const MANAGER_MAP = {
  'k.woch@maturalni.com': 'm.gancarczyk@maturalni.com',
  'r.szumelda@maturalni.com': 'm.gancarczyk@maturalni.com',
  'm.noga@maturalni.com': 'm.gancarczyk@maturalni.com'
};

// Unikalna lista maili kierowników – używana m.in. do nadawania roli 'manager'.
export const MANAGER_EMAILS = [...new Set(Object.values(MANAGER_MAP))];

export function resolveManagerEmail(email) {
  return MANAGER_MAP[String(email || '').trim().toLowerCase()] || null;
}
