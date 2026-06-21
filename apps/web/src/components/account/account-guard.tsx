'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AccountView } from './account-view';

/** Protege la cuenta en cliente: la sesión vive en memoria y se rehidrata al cargar. */
export function AccountGuard() {
  const t = useTranslations('account');
  const status = useAuthStore((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-[45dvh] items-center justify-center" aria-live="polite" aria-busy="true">
        <Loader2 className="size-6 animate-spin text-muted" aria-hidden="true" />
        <span className="sr-only">{t('loading')}</span>
      </div>
    );
  }

  return <AccountView />;
}
