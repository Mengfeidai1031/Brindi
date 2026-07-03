import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allocateProportional, splitEqual } from './calculate.ts';

function sum(alloc: Record<string, number>): number {
  return Object.values(alloc).reduce((a, b) => a + b, 0);
}

test('allocateProportional reparte exactamente el total (pesos iguales)', () => {
  const alloc = allocateProportional(1000, [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
  ]);
  assert.equal(alloc.a, 500);
  assert.equal(alloc.b, 500);
  assert.equal(sum(alloc), 1000);
});

test('allocateProportional usa el mayor resto y nunca pierde céntimos', () => {
  const alloc = allocateProportional(1000, [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 2 },
  ]);
  assert.equal(sum(alloc), 1000); // sin céntimos perdidos
  assert.equal(alloc.b > alloc.a, true);

  // total que no divide de forma exacta entre 3
  const alloc3 = allocateProportional(1001, [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 },
  ]);
  assert.equal(sum(alloc3), 1001);
});

test('allocateProportional con todos los pesos a 0 reparte a partes iguales', () => {
  const alloc = allocateProportional(900, [
    { id: 'a', weight: 0 },
    { id: 'b', weight: 0 },
    { id: 'c', weight: 0 },
  ]);
  assert.equal(sum(alloc), 900);
  assert.equal(alloc.a, 300);
});

test('splitEqual reparte el total sin perder céntimos', () => {
  const alloc = splitEqual(1000, ['a', 'b', 'c']);
  assert.equal(sum(alloc), 1000);
  const alloc2 = splitEqual(1001, ['a', 'b', 'c']);
  assert.equal(sum(alloc2), 1001);
});
