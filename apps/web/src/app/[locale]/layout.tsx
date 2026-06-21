import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Providers } from '@/components/providers';
import { PwaRegister } from '@/components/pwa-register';
import { AuthBootstrap } from '@/components/auth/auth-bootstrap';
import { APP_NAME } from '@/config/app';
import { routing } from '@/i18n/routing';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: { default: `${APP_NAME} — Divide. Decide. Plan.`, template: `%s · ${APP_NAME}` },
    description: t('description'),
    applicationName: APP_NAME,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
    icons: { apple: '/icons/apple-touch-icon.png' },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf4e8' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1b1a' },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-sm"
            >
              {t('skipToContent')}
            </a>
            <Header />
            <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 md:pb-12">
              {children}
            </main>
            <Footer />
            <MobileTabBar />
            <PwaRegister />
            <AuthBootstrap />
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
