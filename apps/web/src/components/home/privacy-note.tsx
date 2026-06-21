import { ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function PrivacyNote() {
  const t = await getTranslations('home.privacy');

  return (
    <section className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand" aria-hidden="true">
        <ShieldCheck className="size-6" />
      </span>
      <div>
        <h2 className="font-display text-lg font-bold">{t('title')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t('text')}</p>
      </div>
    </section>
  );
}
