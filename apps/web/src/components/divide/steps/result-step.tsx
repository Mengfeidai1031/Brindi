'use client';

import { Check, RotateCcw, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { formatCents } from '@/lib/divide/money';
import { buildShareText } from '@/lib/divide/share';
import { computeAllocation, personLabel, totalCents } from '@/lib/divide/selectors';
import { useAuthStore } from '@/stores/auth-store';
import { rid, useDivide } from '../divide-context';

export function ResultStep() {
  const t = useTranslations('divide.steps.result');
  const tBill = useTranslations('divide.steps.bill');
  const locale = useLocale();
  const { state, dispatch } = useDivide();
  const paymentLink = useAuthStore((s) => s.user?.paymentLink ?? null);

  const [shared, setShared] = useState<'idle' | 'copied'>('idle');

  const allocation = computeAllocation(state);
  const total = totalCents(state);
  const lines = state.people.map((p, i) => ({
    name: personLabel(p.name, i, tBill('person')),
    cents: allocation[p.id] ?? 0,
  }));

  async function handleShare() {
    const text = buildShareText({
      title: t('shareTitle'),
      totalLabel: tBill('total'),
      totalAmount: formatCents(total, locale),
      lines: lines.map((l) => ({ name: l.name, amount: formatCents(l.cents, locale) })),
      payLabel: paymentLink ? t('payLabel') : undefined,
      payLink: paymentLink,
    });
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: t('shareTitle'), text });
        return;
      }
    } catch {
      // El usuario canceló el diálogo de compartir: no hacemos nada.
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared('copied');
      setTimeout(() => setShared('idle'), 2500);
    } catch {
      // Sin permiso de portapapeles: el usuario puede copiar manualmente.
    }
  }

  function handleReset() {
    dispatch({ type: 'reset', personId1: rid(), personId2: rid(), itemId: rid() });
  }

  return (
    <section aria-labelledby="result-heading" className="space-y-5">
      <div>
        <h2 id="result-heading" className="font-display text-lg font-bold">
          {t('heading')}
        </h2>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {lines.map((line, i) => (
          <li key={state.people[i].id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium">{line.name}</span>
            <span className="font-display text-lg font-bold tabular-nums text-divide">
              {formatCents(line.cents, locale)}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between bg-divide/5 px-4 py-3">
          <span className="text-sm font-semibold text-muted">{tBill('total')}</span>
          <span className="font-semibold tabular-nums">{formatCents(total, locale)}</span>
        </li>
      </ul>

      {paymentLink && <p className="text-xs text-muted">{t('payIncluded')}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-deep px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {shared === 'copied' ? (
            <>
              <Check className="size-4" aria-hidden="true" />
              {t('copied')}
            </>
          ) : (
            <>
              <Share2 className="size-4" aria-hidden="true" />
              {t('share')}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-medium transition-colors hover:border-foreground/30"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('restart')}
        </button>
      </div>

      <p className="text-center text-xs text-muted">{t('privacy')}</p>
    </section>
  );
}
