// Test jednostkowy rezerwacji — reservedFromOperations z src/stock.js (czysta
// agregacja: które otwarte operacje rezerwują ile, per produkt i per lokalizacja).
// Uruchom: `node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reservedFromOperations, RESERVING_OP_TYPES, RESERVING_OP_STATES } from '../src/stock.js';

const op = (over) => ({ type: 'delivery', state: 'draft', fromLocationId: 'LOC-A', lines: [], ...over });

test('stałe: rezerwują dostawa/odpad/konwersja w stanach draft/ready', () => {
  assert.deepEqual([...RESERVING_OP_TYPES].sort(), ['conversion', 'delivery', 'scrap']);
  assert.deepEqual([...RESERVING_OP_STATES].sort(), ['draft', 'ready']);
});

test('dostawa draft rezerwuje per produkt i per (produkt, lokalizacja)', () => {
  const { byItem, byItemLoc } = reservedFromOperations([
    op({ lines: [{ itemCode: 'GADZ-1', quantity: 3 }, { itemCode: 'GADZ-2', quantity: 5 }] })
  ]);
  assert.equal(byItem.get('GADZ-1'), 3);
  assert.equal(byItem.get('GADZ-2'), 5);
  assert.equal(byItemLoc.get('GADZ-1::LOC-A'), 3);
});

test('odpad (ready) i konwersja (draft) też rezerwują; konwersja rezerwuje źródło', () => {
  const { byItem } = reservedFromOperations([
    op({ type: 'scrap', state: 'ready', lines: [{ itemCode: 'GADZ-1', quantity: 2 }] }),
    op({ type: 'conversion', state: 'draft', lines: [{ itemCode: 'TOWA-1', targetItemCode: 'GADZ-9', quantity: 4 }] })
  ]);
  assert.equal(byItem.get('GADZ-1'), 2);
  assert.equal(byItem.get('TOWA-1'), 4); // źródło konwersji
  assert.equal(byItem.has('GADZ-9'), false); // cel nie jest rezerwowany
});

test('operacje done/cancelled oraz typy nie-wydające NIE rezerwują', () => {
  const { byItem } = reservedFromOperations([
    op({ state: 'done', lines: [{ itemCode: 'X', quantity: 9 }] }),
    op({ state: 'cancelled', lines: [{ itemCode: 'X', quantity: 9 }] }),
    op({ type: 'receipt', lines: [{ itemCode: 'X', quantity: 9 }] }),
    op({ type: 'internal', lines: [{ itemCode: 'X', quantity: 9 }] }),
    op({ type: 'adjustment', lines: [{ itemCode: 'X', countedQty: 9 }] })
  ]);
  assert.equal(byItem.size, 0);
});

test('wiele operacji na ten sam produkt sumuje się; różne lokalizacje rozdzielone', () => {
  const { byItem, byItemLoc } = reservedFromOperations([
    op({ fromLocationId: 'LOC-A', lines: [{ itemCode: 'G', quantity: 3 }] }),
    op({ fromLocationId: 'LOC-B', lines: [{ itemCode: 'G', quantity: 2 }] }),
    op({ fromLocationId: 'LOC-A', lines: [{ itemCode: 'G', quantity: 1 }] })
  ]);
  assert.equal(byItem.get('G'), 6);
  assert.equal(byItemLoc.get('G::LOC-A'), 4);
  assert.equal(byItemLoc.get('G::LOC-B'), 2);
});

test('śmieci/puste linie ignorowane, brak wybuchu', () => {
  assert.equal(reservedFromOperations(null).byItem.size, 0);
  const { byItem } = reservedFromOperations([
    op({ lines: [{ itemCode: '', quantity: 5 }, { itemCode: 'G', quantity: 0 }, { itemCode: 'G', quantity: -3 }] })
  ]);
  assert.equal(byItem.size, 0);
});
