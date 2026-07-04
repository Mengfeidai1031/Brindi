import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeTargetRotation, segmentAtPointer, segmentColor, SEGMENT_COLORS } from './roulette.ts';

test('la rotación destino aterriza siempre en el segmento elegido (invariante)', () => {
  for (let segments = 2; segments <= 12; segments++) {
    for (let chosen = 0; chosen < segments; chosen++) {
      const target = computeTargetRotation(0, chosen, segments, 5);
      assert.equal(segmentAtPointer(target, segments), chosen, `segments=${segments} chosen=${chosen}`);
    }
  }
});

test('la invariante se mantiene partiendo de una rotación previa arbitraria', () => {
  for (const current of [13, 370, -45, 1234.5]) {
    const target = computeTargetRotation(current, 3, 8, 4);
    assert.equal(segmentAtPointer(target, 8), 3);
    assert.ok(target > current); // siempre gira hacia delante
  }
});

test('segmentColor cicla por la paleta', () => {
  assert.equal(segmentColor(0), SEGMENT_COLORS[0]);
  assert.equal(segmentColor(SEGMENT_COLORS.length), SEGMENT_COLORS[0]);
});
