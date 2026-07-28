// Logika domenowa onboardingu — współdzielona między trasami
// (src/routes/onboarding.js) a Pulpitem alertów (/admin/alerts w index.js).

export function onboardingStepView(s) {
  return {
    id: String(s._id),
    title: s.title || '',
    description: s.description || '',
    category: s.category || 'Ogólne',
    url: s.url || '',
    // owner: 'self' = pracownik odhacza sam; 'til' = dostęp/sprzęt (pracownik prosi,
    // TiL przyznaje, pracownik potwierdza — krok 3-stanowy).
    owner: s.owner === 'til' ? 'til' : 'self',
    sortOrder: Number(s.sortOrder) || 0
  };
}

// Czy krok jest ukończony dla danego wpisu postępu (self → done; til → confirmed).
export function onboardingStepComplete(step, progress) {
  if ((step.owner === 'til')) return progress?.state === 'confirmed';
  return !!(progress && progress.done);
}
