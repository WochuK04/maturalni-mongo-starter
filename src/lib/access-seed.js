import { collections } from '../schema.js';
import { DEFAULT_FX_RATES } from './access-dicts.js';

// Osiem podmiotów / marek do zasilenia startowego. `domain` = główna domena marki.
export const ENTITY_SEED = [
  { name: 'maturalni.com', domain: 'maturalni.com' },
  { name: 'mlodziliderzy.pl', domain: 'mlodziliderzy.pl' },
  { name: 'klubmlodychliderow.pl', domain: 'klubmlodychliderow.pl' },
  { name: 'korki.pl', domain: 'korki.pl' },
  { name: 'kursye8.pl', domain: 'kursye8.pl' },
  { name: 'szkolamaturalnych.pl', domain: 'szkolamaturalnych.pl' },
  { name: 'smarted.pl', domain: 'smarted.pl' },
  { name: 'turboweekend.pl', domain: 'turboweekend.pl' }
];

// Idempotentne zasilenie startowe „Mapy dostępów": podmioty + domyślne kursy walut.
// Upsert po nazwie/kluczu → nie nadpisuje ręcznych zmian (tylko $setOnInsert).
export async function seedAccessMapDefaults(db) {
  const now = new Date();
  for (const e of ENTITY_SEED) {
    await db.collection(collections.entities).updateOne(
      { name: e.name },
      { $setOnInsert: { name: e.name, domain: e.domain, type: 'Marka', createdAt: now, updatedAt: now } },
      { upsert: true }
    );
  }
  await db.collection(collections.settings).updateOne(
    { key: 'fxRates' },
    { $setOnInsert: { key: 'fxRates', rates: { ...DEFAULT_FX_RATES }, updatedAt: now } },
    { upsert: true }
  );
}
