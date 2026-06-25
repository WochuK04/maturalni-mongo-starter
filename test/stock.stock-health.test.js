// Test jednostkowy czystej funkcji computeStockHealth (bez bazy, bez zależności).
// Sprawdza zestawienie trzech źródeł ilości (cache / quanty realne / partie) oraz
// wykrywanie quantów ujemnych na stanie realnym i quantów-sierot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStockHealth } from '../src/stock.js';

// Lokalizacje: STOCK (internal, realna), EMP (employee, realna), VIRT (supplier, wirtualna).
const locations = [
  { _id: 'STOCK', name: 'Magazyn', kind: 'internal' },
  { _id: 'EMP', name: 'U pracownika', kind: 'employee' },
  { _id: 'VIRT', name: 'Dostawcy', kind: 'supplier' }
];

test('zgodne źródła → brak rozjazdów', () => {
  const products = [
    { itemCode: 'A', name: 'A', category: 'towar', quantity: 5,
      priceBatches: [{ qty: 2, unitPrice: 1 }, { qty: 3, unitPrice: 1 }] }
  ];
  const quants = [
    { itemCode: 'A', locationId: 'STOCK', quantity: 3 },
    { itemCode: 'A', locationId: 'EMP', quantity: 2 }
  ];
  const out = computeStockHealth({ products, quants, locations, knownItemCodes: ['A'] });
  assert.equal(out.mismatches.length, 0);
  assert.equal(out.summary.ok, true);
});

test('cache ≠ Σ quanty (lokalizacje wirtualne nie liczą się do stanu realnego)', () => {
  const products = [{ itemCode: 'A', name: 'A', category: 'towar', quantity: 5, priceBatches: [] }];
  const quants = [
    { itemCode: 'A', locationId: 'STOCK', quantity: 3 },
    { itemCode: 'A', locationId: 'VIRT', quantity: 2 } // wirtualna → poza stanem realnym
  ];
  const out = computeStockHealth({ products, quants, locations, knownItemCodes: ['A'] });
  assert.equal(out.mismatches.length, 1);
  const m = out.mismatches[0];
  assert.equal(m.cacheQty, 5);
  assert.equal(m.quantStockSum, 3); // tylko STOCK
  assert.ok(m.issues.includes('cache_vs_quant'));
});

test('partie ≠ cache i partie ≠ quanty (import partii bez ruchów)', () => {
  // Produkt z partiami (suma 10) i cache 10, ale bez quantów (brak ruchów).
  const products = [{ itemCode: 'B', name: 'B', category: 'towar', quantity: 10,
    priceBatches: [{ qty: 10, unitPrice: 2 }] }];
  const quants = [];
  const out = computeStockHealth({ products, quants, locations, knownItemCodes: ['B'] });
  assert.equal(out.mismatches.length, 1);
  const m = out.mismatches[0];
  assert.equal(m.cacheQty, 10);
  assert.equal(m.quantStockSum, 0);
  assert.equal(m.batchSum, 10);
  assert.equal(m.hasQuants, false);
  assert.deepEqual(m.issues.sort(), ['batch_vs_quant', 'cache_vs_quant'].sort());
});

test('quant ujemny na stanie realnym → zgłoszony; wirtualny ujemny → ignorowany', () => {
  const products = [{ itemCode: 'A', name: 'A', category: 'towar', quantity: -1, priceBatches: [] }];
  const quants = [
    { itemCode: 'A', locationId: 'STOCK', quantity: -1 }, // realny ujemny → błąd
    { itemCode: 'A', locationId: 'VIRT', quantity: -7 }   // wirtualny ujemny → OK
  ];
  const out = computeStockHealth({ products, quants, locations, knownItemCodes: ['A'] });
  assert.equal(out.negativeQuants.length, 1);
  assert.equal(out.negativeQuants[0].locationId, 'STOCK');
  assert.equal(out.negativeQuants[0].quantity, -1);
});

test('quanty-sieroty: nieznany itemCode oraz nieistniejąca lokalizacja', () => {
  const products = [];
  const quants = [
    { itemCode: 'GHOST', locationId: 'STOCK', quantity: 4 },   // itemCode spoza items
    { itemCode: 'A', locationId: 'NOPE', quantity: 1 }          // locationId nie istnieje
  ];
  const out = computeStockHealth({ products, quants, locations, knownItemCodes: ['A'] });
  assert.equal(out.orphanQuants.length, 2);
  const byCode = Object.fromEntries(out.orphanQuants.map(o => [o.itemCode, o.reasons]));
  assert.deepEqual(byCode.GHOST, ['item']);
  assert.deepEqual(byCode.A, ['location']);
});

test('summary liczy wszystkie kategorie problemów', () => {
  const products = [{ itemCode: 'A', name: 'A', category: 'towar', quantity: 5, priceBatches: [] }];
  const quants = [
    { itemCode: 'A', locationId: 'STOCK', quantity: 3 },  // cache≠quant
    { itemCode: 'A', locationId: 'STOCK', quantity: -2 }, // (sumuje się do 1, ale ujemny pojedynczy quant też łapiemy)
    { itemCode: 'GHOST', locationId: 'STOCK', quantity: 1 }
  ];
  const out = computeStockHealth({ products, quants, locations, knownItemCodes: ['A'] });
  assert.equal(out.summary.mismatchCount, 1);
  assert.equal(out.summary.negativeQuantCount, 1);
  assert.equal(out.summary.orphanQuantCount, 1);
  assert.equal(out.summary.ok, false);
});
