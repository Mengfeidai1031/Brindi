'use client';

import { CircleUserRound, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

/** Acceso a sesión en la cabecera: login si no hay sesión, cuenta si la hay. */
export function AuthNav() {
  const t = useTranslations('auth.nav');
  const status = useAuthStore((s) => s.status);

  // Marcador de tamaño estable mientras se resuelve la sesión (evita saltos).
  if (status === 'loading') {
    return <span className="inline-block h-9 w-9 rounded-lg sm:w-24" aria-hidden="true" />;
  }

  if (status === 'authenticated') {
    return (
      <Link
        href="/account"
        className="flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
      >
        <CircleUserRound className="size-4 text-brand" aria-hidden="true" />
        <span className="hidden sm:inline">{t('account')}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
    >
      <LogIn className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{t('login')}</span>
    </Link>
  );
}
