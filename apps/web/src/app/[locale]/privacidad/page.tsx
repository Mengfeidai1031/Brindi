import { getTranslations } from 'next-intl/server';
import { APP_NAME } from '@/config/app';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('heading'), description: t('intro') };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });

  const sections = [
    { title: t('noStoreTitle'), body: t('noStore') },
    { title: t('accountTitle'), body: t('account') },
    { title: t('contactTitle'), body: t('contact') },
  ];

  return (
    <article className="mx-auto max-w-2xl space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold">{t('heading')}</h1>
        <p className="text-muted">{t('intro')}</p>
      </header>

      {sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="font-display text-xl font-bold">{s.title}</h2>
          <p className="text-sm leading-relaxed text-muted">{s.body}</p>
        </section>
      ))}

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">{t('adsTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted">{t('ads')}</p>
        <p className="text-sm">
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand underline underline-offset-2"
          >
            {t('adsChoicesLink')}
          </a>
        </p>
      </section>

      <footer className="border-t border-line pt-4 text-xs text-muted">
        © {new Date().getFullYear()} {APP_NAME}
      </footer>
    </article>
  );
}
