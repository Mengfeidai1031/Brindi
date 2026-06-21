'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';

/**
 * Selector manual de idioma. El middleware de next-intl persiste la
 * elección en la cookie NEXT_LOCALE, por lo que se recuerda entre visitas.
 */
export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: AppLocale) {
    if (next !== locale) {
      router.replace(pathname, { locale: next });
    }
  }

  return (
    <div role="group" aria-label={t('label')} className="flex items-center rounded-lg border border-line p-0.5">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          aria-label={t(l)}
          className={`rounded-md px-2 py-1 text-xs font-semibold uppercase transition-colors ${
            l === locale ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
