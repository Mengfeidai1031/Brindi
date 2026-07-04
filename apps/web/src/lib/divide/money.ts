/**
 * Manejo de dinero en céntimos (enteros) para evitar errores de coma flotante.
 * El parseo es tolerante con separadores: acepta "12,50" y "12.50", y deduce el
 * separador decimal como el último símbolo (coma o punto) que aparece.
 */
export function parseAmountToCents(input: string): number | null {
  if (typeof input !== 'string') return null;
  let s = input.trim().replace(/[^\d.,]/g, '');
  if (s === '') return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let decimal: ',' | '.' | null = null;
  if (lastComma > lastDot) decimal = ',';
  else if (lastDot > lastComma) decimal = '.';

  if (decimal) {
    const thousands = decimal === ',' ? '.' : ',';
    s = s.split(thousands).join('').replace(decimal, '.');
  } else {
    s = s.replace(/[.,]/g, '');
  }

  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Formatea céntimos como moneda en el idioma dado (EUR, mercado principal). */
export function formatCents(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/** Parsea un porcentaje entero (0–100). Devuelve null si no es válido. */
export function parsePercent(input: string): number | null {
  const s = input.trim().replace(/[^\d]/g, '');
  if (s === '') return null;
  const value = Number(s);
  if (!Number.isInteger(value) || value < 0 || value > 100) return null;
  return value;
}
