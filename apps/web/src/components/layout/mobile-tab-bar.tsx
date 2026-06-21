'use client';

import { Dices, Home, Map, ReceiptText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const tabs = [
  { href: '/', key: 'home', Icon: Home, activeClass: 'text-brand' },
  { href: '/divide', key: 'divide', Icon: ReceiptText, activeClass: 'text-divide' },
  { href: '/decide', key: 'decide', Icon: Dices, activeClass: 'text-decide' },
  { href: '/plan', key: 'plan', Icon: Map, activeClass: 'text-plan' },
] as const;

/** Barra de pestañas inferior (móvil): navegación estilo app, apta para PWA. */
export function MobileTabBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('tabs')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, key, Icon, activeClass }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  active ? activeClass : 'text-muted'
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
