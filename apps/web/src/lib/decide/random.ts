/**
 * Utilidades de azar para los juegos de Decide. Aceptan un generador `rng`
 * inyectable (por defecto Math.random) para poder testearse de forma determinista.
 */

/** Entero aleatorio en [0, length). Devuelve -1 si length <= 0. */
export function pickIndex(length: number, rng: () => number = Math.random): number {
  if (length <= 0) return -1;
  return Math.min(length - 1, Math.floor(rng() * length));
}

/** Baraja (Fisher–Yates) devolviendo un array nuevo; no muta la entrada. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
