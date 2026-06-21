import { getTranslations } from 'next-intl/server';
import { APP_NAME } from '@/config/app';

export async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-center text-xs text-muted sm:flex-row sm:justify-between sm:text-left">
        <p>
          © {new Date().getFullYear()} {APP_NAME} · {t('rights')}
        </p>
        <p>{t('privacy')}</p>
      </div>
    </footer>
  );
}
