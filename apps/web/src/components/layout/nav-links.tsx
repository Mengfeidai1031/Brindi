'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const items = [
  { href: '/', key: 'home' },
  { href: '/divide', key: 'divide' },
  { href: '/decide', key: 'decide' },
  { href: '/plan', key: 'plan' },
] as const;

export function NavLinks() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-foreground/5 text-foreground' : 'text-muted hover:text-foreground'
              }`}
            >
              {t(item.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
