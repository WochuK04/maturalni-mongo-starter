// Moduł „Magazyn" pokazuje DOKŁADNIE te kategorie (nie-elektronikę). Elektronika
// (i pozostałe, np. Roll-up) żyje w widoku „Dostępny sprzęt". Case-insensitive.
// Współdzielone przez warehouse (index.js) i moduł wyjazdów.
export const WAREHOUSE_ONLY_CATEGORIES = ['gadżet', 'opakowanie', 'sponsor', 'towar'];

export const isWarehouseCategory = (category) =>
  WAREHOUSE_ONLY_CATEGORIES.includes(String(category || '').trim().toLowerCase());
