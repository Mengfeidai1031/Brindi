/**
 * Matemática de la ruleta (pura y testeable). La aguja está fija arriba (12 en
 * punto, 0°) y la rueda gira en sentido horario. Los ángulos se miden desde
 * arriba. La "física" del giro es una deceleración (ease-out) sobre varias
 * vueltas completas hasta detenerse en el segmento elegido.
 */

/** Paleta de la rueda (se cicla si hay más segmentos que colores). */
export const SEGMENT_COLORS = [
  '#d9970f',
  '#649f2b',
  '#2387bd',
  '#e2574c',
  '#178b82',
  '#9b5de5',
  '#f15bb5',
  '#00bbf9',
];

export function segmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

/** Punto en el borde del círculo para un ángulo (0° = arriba, horario). */
function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Path SVG de la cuña del segmento `index` de `segments`. */
export function segmentPath(
  index: number,
  segments: number,
  cx: number,
  cy: number,
  r: number,
): string {
  const seg = 360 / segments;
  const start = index * seg;
  const end = (index + 1) * seg;
  const p1 = polar(cx, cy, r, start);
  const p2 = polar(cx, cy, r, end);
  const largeArc = seg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
}

/** Posición del centro de un segmento (para colocar la etiqueta). */
export function labelPosition(
  index: number,
  segments: number,
  cx: number,
  cy: number,
  r: number,
): { x: number; y: number; angle: number } {
  const seg = 360 / segments;
  const mid = index * seg + seg / 2;
  const p = polar(cx, cy, r, mid);
  return { x: p.x, y: p.y, angle: mid };
}

/**
 * Rotación absoluta (creciente) a la que animar la rueda para que el segmento
 * `chosenIndex` quede centrado bajo la aguja, tras `fullSpins` vueltas.
 */
export function computeTargetRotation(
  current: number,
  chosenIndex: number,
  segments: number,
  fullSpins = 5,
): number {
  const seg = 360 / segments;
  const base = (360 - (chosenIndex * seg + seg / 2)) % 360;
  const currentMod = ((current % 360) + 360) % 360;
  const delta = (base - currentMod + 360) % 360;
  return current + fullSpins * 360 + delta;
}

/** Segmento que queda bajo la aguja (arriba) para una rotación dada. */
export function segmentAtPointer(rotation: number, segments: number): number {
  const seg = 360 / segments;
  const local = ((-rotation % 360) + 360) % 360;
  return Math.floor(local / seg) % segments;
}
