// Seed kroków onboardingu TiL (Technika i Logistyka). Idempotentny: upsert po tytule,
// więc można odpalać wielokrotnie bez duplikatów. Nie usuwa istniejących kroków.
//
// UŻYCIE (środowisko jak aplikacja — PROD = Atlas, baza maturalni_equipment):
//   MONGO_URI="<atlas>" MONGO_DB_NAME=maturalni_equipment node scripts/seed-onboarding.mjs
//   node scripts/seed-onboarding.mjs --dry     # tylko podgląd, bez zapisu
//
// owner: 'self' = pracownik odhacza sam; 'til' = dostęp/sprzęt (prośba→przyznanie→
// potwierdzenie). Kolejność kategorii wynika z sortOrder.

import { connectToDatabase, closeDb } from '../src/db.js';
import { collections } from '../src/schema.js';

const DRY = process.argv.includes('--dry');

// Lista startowa — dopasowana do procesu TiL. Edytuj wg potrzeb (linki uzupełnisz
// później w aplikacji: Onboarding → Edytuj krok).
const STEPS = [
  // Materiały wprowadzające (self — pracownik zapoznaje się)
  { category: 'Materiały wprowadzające', owner: 'self', title: 'Zapoznaj się z wizją firmy', description: 'Dokument z wizją i wartościami firmy (otrzymasz plik / link).' },
  { category: 'Materiały wprowadzające', owner: 'self', title: 'Przewodnik po ClickUp', description: 'Jak korzystamy z ClickUp na co dzień.' },
  { category: 'Materiały wprowadzające', owner: 'self', title: 'Onepager NordPass', description: 'Jak używać menedżera haseł NordPass.' },
  { category: 'Materiały wprowadzające', owner: 'self', title: 'Przeczytaj regulamin i polityki', description: 'Regulamin pracy, RODO, zasady bezpieczeństwa.' },

  // Konta i dostępy (TiL nadaje)
  { category: 'Konta i dostępy', owner: 'til', title: 'Konto Google Workspace (mail firmowy)', description: 'Utworzenie firmowego adresu e-mail.' },
  { category: 'Konta i dostępy', owner: 'til', title: 'Dodanie maila do NordPass', description: 'Dodanie konta do firmowego menedżera haseł.' },
  { category: 'Konta i dostępy', owner: 'til', title: 'Konto w ClickUp', description: 'Dostęp do przestrzeni zadań ClickUp.' },

  // Sprzęt (TiL wydaje)
  { category: 'Sprzęt', owner: 'til', title: 'Laptop', description: 'Wydanie komputera służbowego.' },
  { category: 'Sprzęt', owner: 'til', title: 'Peryferia (mysz, klawiatura, monitor)', description: 'Zestaw akcesoriów na stanowisko.' },
  { category: 'Sprzęt', owner: 'til', title: 'Słuchawki (jeśli dotyczy)', description: 'Wydawane w wybranych rolach.' },

  // Biuro i dostęp fizyczny (TiL przekazuje)
  { category: 'Biuro i dostęp fizyczny', owner: 'til', title: 'Kody do drzwi i alarmu', description: 'Przekazanie kodów dostępu do biura i alarmu.' },
  { category: 'Biuro i dostęp fizyczny', owner: 'til', title: 'Numer do bramy', description: 'Numer telefonu / kod do bramy wjazdowej.' },

  // Formalności (self)
  { category: 'Formalności', owner: 'self', title: 'Uzupełnij dane / profil', description: 'Uzupełnienie danych pracowniczych i profilu.' },
  { category: 'Formalności', owner: 'self', title: 'Skonfiguruj 2FA / bezpieczeństwo', description: 'Włączenie dwuskładnikowego logowania.' },
  { category: 'Formalności', owner: 'self', title: 'Szkolenie wstępne (BHP / wdrożeniowe)', description: 'Ukończenie szkolenia startowego.' }
].map((s, i) => ({ ...s, url: '', sortOrder: (i + 1) * 10 }));

(async () => {
  const db = await connectToDatabase();
  try {
    console.log(`\n${DRY ? 'DRY-RUN — nic nie zapisano.' : 'Seed onboardingu → ' + db.databaseName}`);
    let created = 0, updated = 0;
    for (const s of STEPS) {
      if (DRY) { console.log(`  [${s.owner}] ${s.category} · ${s.title}`); continue; }
      const now = new Date();
      const r = await db.collection(collections.onboardingSteps).updateOne(
        { title: s.title },
        {
          $set: { title: s.title, description: s.description, category: s.category, owner: s.owner, url: s.url, sortOrder: s.sortOrder, isActive: true, updatedAt: now },
          $setOnInsert: { createdAt: now, createdByEmail: 'script:seed-onboarding' }
        },
        { upsert: true }
      );
      if (r.upsertedCount) { created++; console.log(`  + ${s.title}`); }
      else { updated++; console.log(`  ~ ${s.title} (zaktualizowano)`); }
    }
    if (!DRY) console.log(`\nGotowe. Dodano: ${created} · zaktualizowano: ${updated} · łącznie ${STEPS.length} kroków.\n`);
    else console.log(`\n${STEPS.length} kroków w planie. Uruchom bez --dry, by zapisać.\n`);
  } finally { await closeDb(); }
})().catch((e) => { console.error(e); process.exit(1); });
