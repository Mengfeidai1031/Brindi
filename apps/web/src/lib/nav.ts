/** ¿La ruta actual corresponde a `href`? Incluye subrutas (p. ej. /decide/roulette → /decide). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
