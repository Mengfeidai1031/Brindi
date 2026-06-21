import type { LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export interface ModuleFeature {
  key: string;
  Icon: LucideIcon;
}

interface ModulePageProps {
  ns: 'divide' | 'decide' | 'plan';
  Icon: LucideIcon;
  features: readonly ModuleFeature[];
  accent: { iconBox: string; chip: string; feature: string };
}

/** Página placeholder compartida por los tres módulos hasta su incremento. */
export async function ModulePage({ ns, Icon, features, accent }: ModulePageProps) {
  const t = await getTranslations(ns);
  const shared = await getTranslations('modulePages');

  return (
    <div className="space-y-8 py-8 sm:py-12">
      <header className="space-y-4">
        <span className={`grid size-16 place-items-center rounded-2xl ${accent.iconBox}`} aria-hidden="true">
          <Icon className="size-8" />
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">{t('name')}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${accent.chip}`}>
            {shared('badge')}
          </span>
        </div>
        <p className="max-w-2xl text-lg text-muted">{t('lead')}</p>
        <p className="text-sm text-muted">{shared('intro')}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {features.map(({ key, Icon: FeatureIcon }) => (
          <li key={key} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
            <FeatureIcon className={`mt-0.5 size-5 shrink-0 ${accent.feature}`} aria-hidden="true" />
            <div>
              <h2 className="font-medium">{t(`features.${key}.title`)}</h2>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{t(`features.${key}.desc`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
