'use client';

import { Clock, ExternalLink, Navigation, RotateCcw, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { buildMapsLink } from '@/lib/plan/maps';
import type { PlanResult } from '@/lib/plan/plan-types';

export function PlanResultView({ result, onReset }: { result: PlanResult; onReset: () => void }) {
  const t = useTranslations('plan');

  return (
    <div className="space-y-6">
      {result.intro && (
        <p className="rounded-2xl border border-plan/30 bg-plan/5 px-4 py-3 text-sm">{result.intro}</p>
      )}

      <ol className="space-y-4">
        {result.activities.map((a, i) => (
          <li key={i} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-plan/10 text-sm font-bold text-plan">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold">{a.title}</h3>
                {a.placeName && <p className="text-sm font-medium text-plan">{a.placeName}</p>}
                {a.description && <p className="mt-2 text-sm text-muted">{a.description}</p>}

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                  {a.durationLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/10 px-2.5 py-1">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {a.durationLabel}
                    </span>
                  )}
                  {a.costLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/10 px-2.5 py-1">
                      <Wallet className="size-3.5" aria-hidden="true" />
                      {a.costLabel}
                    </span>
                  )}
                </div>

                <a
                  href={buildMapsLink(a.mapQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-plan hover:underline"
                >
                  <Navigation className="size-4" aria-hidden="true" />
                  {t('howToGetThere')}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-center text-xs text-muted">{t('privacyNote')}</p>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground/30"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {t('newPlan')}
      </button>
    </div>
  );
}
