'use client';

import { useTranslations } from 'next-intl';
import { TOTAL_STEPS } from '@/lib/divide/reducer';

const STEP_KEYS = ['people', 'bill', 'split', 'result'] as const;

export function Stepper({ step }: { step: number }) {
  const t = useTranslations('divide.steps');
  const current = STEP_KEYS[step];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5" role="presentation">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-divide' : 'bg-line'
            }`}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-muted">
        {t('progress', { current: step + 1, total: TOTAL_STEPS })} ·{' '}
        <span className="text-foreground">{t(`${current}.title`)}</span>
      </p>
    </div>
  );
}
