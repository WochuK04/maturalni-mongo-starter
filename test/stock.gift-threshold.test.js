// Test jednostkowy raportu progu „prezent ≤20 zł" (VAT) — czysta logika domenowa
// z src/stock.js, bez bazy. Uruchom: `node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGiftThresholdReport, isConversionBatch, GIFT_VAT_THRESHOLD } from '../src/stock.js';

// Skrót: partia konwersyjna (nota jak w applyConversionBatches).
const conv = (qty, unitPrice, ref = 'KONW/2026/0001', src = 'TOWA-1') =>
  ({ qty, unitPrice, note: `${ref} · konwersja z ${src}`, addedAt: new Date('2026-06-01') });
// Skrót: zwykła partia z przyjęcia (nie konwersja).
const receipt = (qty, unitPrice) => ({ qty, unitPrice, note: 'PRZ/2026/0007 · Dostawca', addedAt: new Date('2026-06-01') });

test('domyślny próg to 20 zł', () => {
  assert.equal(GIFT_VAT_THRESHOLD, 20);
});

test('isConversionBatch łapie tylko partie konwersyjne (nie zwroty)', () => {
  assert.equal(isConversionBatch('KONW/2026/0001 · konwersja z TOWA-1'), true);
  assert.equal(isConversionBatch('PRZ/2026/0007 · Dostawca'), false);
  assert.equal(isConversionBatch('Zwrot z konwersji KONW/2026/0001'), false); // trafia na towar, nie gadżet
  assert.equal(isConversionBatch(''), false);
  assert.equal(isConversionBatch(null), false);
});

test('flaguje gadżet z konwersji powyżej progu, pomija partie ≤ progu i z przyjęcia', () => {
  const items = [
    { itemCode: 'GADZ-1', name: 'Smycz premium', category: 'gadżet', priceBatches: [conv(10, 25)] }, // > 20 → ryzyko
    { itemCode: 'GADZ-2', name: 'Długopis', category: 'gadżet', priceBatches: [conv(50, 12)] },      // ≤ 20 → ok
    { itemCode: 'GADZ-3', name: 'Kubek kupiony', category: 'gadżet', priceBatches: [receipt(5, 40)] } // nie konwersja → poza zakresem
  ];
  const r = computeGiftThresholdReport(items);
  assert.equal(r.threshold, 20);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].itemCode, 'GADZ-1');
  assert.equal(r.items[0].maxUnitPrice, 25);
  assert.equal(r.items[0].overQty, 10);
  assert.equal(r.items[0].overValue, 250);
  assert.equal(r.summary.riskItemCount, 1);
  assert.equal(r.summary.riskQty, 10);
  assert.equal(r.summary.riskValue, 250);
  // GADZ-1 i GADZ-2 mają partie konwersyjne na stanie; GADZ-3 nie.
  assert.equal(r.summary.conversionItemCount, 2);
});

test('dokładnie próg (20 zł) nie jest ryzykiem — porównanie ostre', () => {
  const r = computeGiftThresholdReport([
    { itemCode: 'G', name: 'x', category: 'gadżet', priceBatches: [conv(3, 20)] }
  ]);
  assert.equal(r.items.length, 0);
  assert.equal(r.summary.conversionItemCount, 1);
});

test('partie zużyte FIFO (qty 0) są pomijane — to już wydany towar', () => {
  const r = computeGiftThresholdReport([
    { itemCode: 'G', name: 'x', category: 'gadżet', priceBatches: [conv(0, 99), conv(2, 30)] }
  ]);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].overQty, 2);          // tylko partia trzymana na stanie
  assert.equal(r.items[0].overValue, 60);
  assert.equal(r.items[0].maxUnitPrice, 30);     // partia 99 zł (qty 0) nie liczy się
  assert.equal(r.items[0].batches.length, 1);
});

test('konfigurowalny próg', () => {
  const items = [{ itemCode: 'G', name: 'x', category: 'gadżet', priceBatches: [conv(4, 25)] }];
  assert.equal(computeGiftThresholdReport(items, 30).items.length, 0); // 25 ≤ 30
  assert.equal(computeGiftThresholdReport(items, 10).items.length, 1); // 25 > 10
  // nieprawidłowy próg → fallback na domyślny 20
  assert.equal(computeGiftThresholdReport(items, 'abc').threshold, 20);
  assert.equal(computeGiftThresholdReport(items, -5).threshold, 20);
});

test('wiele partii w jednej pozycji: sumy i sortowanie po max koszcie', () => {
  const items = [
    { itemCode: 'A', name: 'Aaa', category: 'gadżet', priceBatches: [conv(2, 22), conv(1, 30), conv(100, 5)] }, // 22 i 30 > 20; 5 ≤ 20
    { itemCode: 'B', name: 'Bbb', category: 'gadżet', priceBatches: [conv(5, 100)] }
  ];
  const r = computeGiftThresholdReport(items);
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].itemCode, 'B'); // 100 > 30 → najpierw
  const a = r.items.find(i => i.itemCode === 'A');
  assert.equal(a.overQty, 3);             // 2 + 1 (partia 5 zł poza)
  assert.equal(a.overValue, 74);          // 2*22 + 1*30
  assert.equal(a.maxUnitPrice, 30);
  assert.equal(a.batches.length, 2);
  assert.equal(a.batches[0].unitPrice, 30); // partie sortowane malejąco po cenie
});

test('wejście puste / bez partii nie wybucha', () => {
  assert.deepEqual(computeGiftThresholdReport([]).items, []);
  assert.deepEqual(computeGiftThresholdReport(null).items, []);
  assert.equal(computeGiftThresholdReport([{ itemCode: 'X', category: 'gadżet' }]).items.length, 0);
});
