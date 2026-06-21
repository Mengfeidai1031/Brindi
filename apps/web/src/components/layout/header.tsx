import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { AuthNav } from '@/components/auth/auth-nav';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { APP_NAME } from '@/config/app';
import { Link } from '@/i18n/navigation';
import { NavLinks } from './nav-links';

export async function Header() {
  const t = await getTranslations('nav');

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 rounded-lg" aria-label={APP_NAME}>
          <Image src="/icons/icon-192.png" alt="" width={32} height={32} priority className="rounded-lg" />
          <span className="font-display text-lg font-extrabold tracking-tight">{APP_NAME}</span>
        </Link>
        <nav aria-label={t('main')} className="hidden md:block">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-1.5">
          <AuthNav />
          <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
