// Test jednostkowy blokady rezerwacji — checkReservation z src/stock.js (czysta
// logika: zapotrzebowanie per produkt vs dostępne = on-hand − rezerwacje innych).
// Uruchom: `node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkReservation } from '../src/stock.js';

test('OK gdy zapotrzebowanie ≤ dostępne', () => {
  const r = checkReservation(
    [{ itemCode: 'G', quantity: 4 }],
    new Map([['G', 10]]),
    new Map([['G', 6]]) // dostępne = 4
  );
  assert.equal(r.ok, true);
  assert.equal(r.violations.length, 0);
});

test('naruszenie gdy zapotrzebowanie > dostępne (ze szczegółami)', () => {
  const r = checkReservation(
    [{ itemCode: 'G', quantity: 5 }],
    new Map([['G', 10]]),
    new Map([['G', 6]]) // dostępne = 4
  );
  assert.equal(r.ok, false);
  assert.deepEqual(r.violations[0], { itemCode: 'G', demand: 5, onHand: 10, otherReserved: 6, available: 4 });
});

test('granica: zapotrzebowanie == dostępne jest OK', () => {
  const r = checkReservation([{ itemCode: 'G', quantity: 4 }], new Map([['G', 10]]), new Map([['G', 6]]));
  assert.equal(r.ok, true);
});

test('linie tego samego produktu sumują się', () => {
  const r = checkReservation(
    [{ itemCode: 'G', quantity: 3 }, { itemCode: 'G', quantity: 3 }],
    new Map([['G', 10]]), new Map([['G', 6]]) // dostępne 4, zapotrzebowanie 6
  );
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].demand, 6);
});

test('dostępne nie schodzi poniżej zera (rezerwacje > on-hand)', () => {
  const r = checkReservation([{ itemCode: 'G', quantity: 1 }], new Map([['G', 5]]), new Map([['G', 9]]));
  assert.equal(r.violations[0].available, 0);
  assert.equal(r.ok, false);
});

test('brak on-hand → dostępne 0', () => {
  const r = checkReservation([{ itemCode: 'NOWY', quantity: 1 }], new Map(), new Map());
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].available, 0);
});

test('akceptuje zwykłe obiekty zamiast Map', () => {
  const r = checkReservation([{ itemCode: 'G', quantity: 2 }], { G: 10 }, { G: 3 });
  assert.equal(r.ok, true);
});

test('puste/śmieciowe linie nie tworzą naruszeń', () => {
  const r = checkReservation(
    [{ itemCode: '', quantity: 9 }, { itemCode: 'G', quantity: 0 }],
    new Map([['G', 1]]), new Map()
  );
  assert.equal(r.ok, true);
  assert.equal(r.violations.length, 0);
});
