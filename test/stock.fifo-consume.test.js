// Test jednostkowy fifoConsume — zdejmowania ilości z warstw partii cenowych FIFO.
// To rdzeń logiki rozchodu (dostawa/odpad/konwersja): koszt zdjętej ilości + lista
// zdjętych transz do odwrócenia operacji. Funkcja mutuje qty warstw w miejscu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fifoConsume } from '../src/stock.js';

test('zdejmuje z pierwszej warstwy i liczy koszt', () => {
  const batches = [{ qty: 6, unitPrice: 10 }, { qty: 4, unitPrice: 20 }];
  const { consumed, cost } = fifoConsume(batches, 3);
  assert.deepEqual(consumed, [{ qty: 3, unitPrice: 10 }]);
  assert.equal(cost, 30);
  assert.equal(batches[0].qty, 3); // zmutowana
  assert.equal(batches[1].qty, 4);
});

test('przechodzi przez warstwy gdy pierwsza nie wystarcza', () => {
  const batches = [{ qty: 6, unitPrice: 10 }, { qty: 4, unitPrice: 20 }];
  const { consumed, cost } = fifoConsume(batches, 8);
  assert.deepEqual(consumed, [{ qty: 6, unitPrice: 10 }, { qty: 2, unitPrice: 20 }]);
  assert.equal(cost, 60 + 40);
  assert.equal(batches[0].qty, 0);
  assert.equal(batches[1].qty, 2);
});

test('żądanie ponad dostępne zdejmuje wszystko, resztę ignoruje', () => {
  const batches = [{ qty: 6, unitPrice: 10 }, { qty: 4, unitPrice: 20 }];
  const { consumed, cost } = fifoConsume(batches, 100);
  assert.equal(consumed.reduce((s, c) => s + c.qty, 0), 10);
  assert.equal(cost, 60 + 80);
  assert.equal(batches[0].qty, 0);
  assert.equal(batches[1].qty, 0);
});

test('qty 0 nie zdejmuje nic', () => {
  const batches = [{ qty: 5, unitPrice: 1 }];
  const { consumed, cost } = fifoConsume(batches, 0);
  assert.deepEqual(consumed, []);
  assert.equal(cost, 0);
  assert.equal(batches[0].qty, 5);
});
