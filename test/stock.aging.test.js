// Test jednostkowy czystej funkcji computeAging (bez bazy). `now` podajemy na sztywno,
// a addedAt warstw liczymy względem niego, żeby kubełki wieku były deterministyczne.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAging } from '../src/stock.js';

const NOW = new Date('2026-06-25T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d) => new Date(NOW.getTime() - d * DAY);

test('warstwy trafiają do właściwych kubełków wieku', () => {
  const items = [
    { itemCode: 'A', name: 'A', category: 'towar', priceBatches: [
      { qty: 2, unitPrice: 10, addedAt: daysAgo(5) },    // ≤30
      { qty: 3, unitPrice: 10, addedAt: daysAgo(60) },   // 31–90
      { qty: 1, unitPrice: 10, addedAt: daysAgo(120) },  // 91–180
      { qty: 4, unitPrice: 10, addedAt: daysAgo(400) }   // >180
    ] }
  ];
  const out = computeAging(items, NOW);
  const band = Object.fromEntries(out.bands.map(b => [b.key, b]));
  assert.equal(band.le30.qty, 2);
  assert.equal(band.d31_90.qty, 3);
  assert.equal(band.d91_180.qty, 1);
  assert.equal(band.gt180.qty, 4);
  assert.equal(out.totalQty, 10);
  assert.equal(out.totalValue, 100);
  assert.equal(out.agedQty, 4);       // >180
  assert.equal(out.agedValue, 40);
});

test('granice kubełków: dokładnie 30 i 90 dni są w młodszym paśmie', () => {
  const items = [{ itemCode: 'A', name: 'A', category: 'towar', priceBatches: [
    { qty: 1, unitPrice: 1, addedAt: daysAgo(30) }, // ≤30
    { qty: 1, unitPrice: 1, addedAt: daysAgo(90) }, // ≤90 (31–90)
    { qty: 1, unitPrice: 1, addedAt: daysAgo(181) } // >180
  ] }];
  const out = computeAging(items, NOW);
  const band = Object.fromEntries(out.bands.map(b => [b.key, b]));
  assert.equal(band.le30.qty, 1);
  assert.equal(band.d31_90.qty, 1);
  assert.equal(band.gt180.qty, 1);
});

test('warstwy zużyte (qty 0) są pomijane', () => {
  const items = [{ itemCode: 'A', name: 'A', category: 'towar', priceBatches: [
    { qty: 0, unitPrice: 50, addedAt: daysAgo(10) },
    { qty: 2, unitPrice: 5, addedAt: daysAgo(10) }
  ] }];
  const out = computeAging(items, NOW);
  assert.equal(out.totalQty, 2);
  assert.equal(out.totalValue, 10);
});

test('warstwa bez daty trafia do >180 i oldestDays = null', () => {
  const items = [{ itemCode: 'A', name: 'A', category: 'towar', priceBatches: [
    { qty: 3, unitPrice: 2 } // brak addedAt
  ] }];
  const out = computeAging(items, NOW);
  const band = Object.fromEntries(out.bands.map(b => [b.key, b]));
  assert.equal(band.gt180.qty, 3);
  assert.equal(out.products[0].oldestDays, null);
  assert.equal(out.products[0].agedQty, 3);
});

test('produkt bez warstw na stanie nie pojawia się w wyniku', () => {
  const items = [{ itemCode: 'A', name: 'A', category: 'towar', priceBatches: [] }];
  const out = computeAging(items, NOW);
  assert.equal(out.productCount, 0);
  assert.equal(out.products.length, 0);
});

test('sortowanie: najbardziej zalegające najpierw', () => {
  const items = [
    { itemCode: 'NOWY', name: 'Nowy', category: 'towar', priceBatches: [{ qty: 1, unitPrice: 1, addedAt: daysAgo(2) }] },
    { itemCode: 'STARY', name: 'Stary', category: 'towar', priceBatches: [{ qty: 1, unitPrice: 1, addedAt: daysAgo(300) }] }
  ];
  const out = computeAging(items, NOW);
  assert.equal(out.products[0].itemCode, 'STARY');
  assert.equal(out.products[1].itemCode, 'NOWY');
});
