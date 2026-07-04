/** Deep link de búsqueda en Google Maps (no requiere clave de API). */
export function buildMapsLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
