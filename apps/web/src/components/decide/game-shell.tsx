'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

/** Marco común de un juego de Decide: enlace de vuelta al hub, título y descripción. */
export function GameShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const t = useTranslations('decide.common');
  return (
    <div className="py-6 sm:py-10">
      <Link
        href="/decide"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('back')}
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-sm text-muted">{description}</p>
      </header>
      {children}
    </div>
  );
}
