import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCents, parseAmountToCents } from './money.ts';

test('parseAmountToCents acepta coma y punto decimal', () => {
  assert.equal(parseAmountToCents('12,50'), 1250);
  assert.equal(parseAmountToCents('12.50'), 1250);
  assert.equal(parseAmountToCents('10'), 1000);
  assert.equal(parseAmountToCents('0'), 0);
});

test('parseAmountToCents rechaza entradas no válidas', () => {
  assert.equal(parseAmountToCents(''), null);
  assert.equal(parseAmountToCents('abc'), null);
});

test('formatCents da un importe legible en euros', () => {
  const out = formatCents(1250, 'es');
  assert.match(out, /12/);
  assert.match(out, /50/);
  assert.match(out, /€/);
});
