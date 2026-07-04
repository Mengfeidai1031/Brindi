import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { APP_NAME } from '@/config/app';

export async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-center text-xs text-muted sm:flex-row sm:justify-between sm:text-left">
        <p>
          © {new Date().getFullYear()} {APP_NAME} · {t('rights')}
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-end">
          <span>{t('privacy')}</span>
          <Link href="/privacidad" className="underline underline-offset-2 transition-colors hover:text-foreground">
            {t('privacyLink')}
          </Link>
        </p>
      </div>
    </footer>
  );
}
