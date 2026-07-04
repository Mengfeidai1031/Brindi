import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickIndex, shuffle } from './random.ts';

test('pickIndex respeta los límites con rng controlado', () => {
  assert.equal(pickIndex(5, () => 0), 0);
  assert.equal(pickIndex(5, () => 0.999), 4);
  assert.equal(pickIndex(1, () => 0.5), 0);
});

test('pickIndex siempre devuelve un índice válido (Math.random)', () => {
  for (let i = 0; i < 200; i++) {
    const idx = pickIndex(7);
    assert.ok(idx >= 0 && idx < 7 && Number.isInteger(idx));
  }
});

test('shuffle es una permutación y no muta la entrada', () => {
  const input = ['a', 'b', 'c', 'd', 'e'];
  const out = shuffle(input, () => 0);
  assert.equal(out.length, input.length);
  assert.deepEqual([...out].sort(), [...input].sort());
  assert.deepEqual(input, ['a', 'b', 'c', 'd', 'e']); // intacta
});
