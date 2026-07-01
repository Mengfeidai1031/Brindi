'use client';

import { Plus, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatCents } from '@/lib/divide/money';
import { totalCents } from '@/lib/divide/selectors';
import { rid, useDivide } from '../divide-context';

export function ItemsStep() {
  const t = useTranslations('divide.steps.bill');
  const locale = useLocale();
  const { state, dispatch } = useDivide();
  const total = totalCents(state);

  return (
    <section aria-labelledby="bill-heading" className="space-y-4">
      <div>
        <h2 id="bill-heading" className="font-display text-lg font-bold">
          {t('heading')}
        </h2>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>

      <ul className="space-y-2">
        {state.items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              type="text"
              value={item.description}
              onChange={(e) => dispatch({ type: 'updateItem', id: item.id, field: 'description', value: e.target.value })}
              placeholder={t('itemPlaceholder', { number: i + 1 })}
              aria-label={t('itemLabel', { number: i + 1 })}
              maxLength={60}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/70 focus-visible:border-brand"
            />
            <input
              type="text"
              inputMode="decimal"
              value={item.amount}
              onChange={(e) => dispatch({ type: 'updateItem', id: item.id, field: 'amount', value: e.target.value })}
              placeholder={t('amountPlaceholder')}
              aria-label={t('amountLabel', { number: i + 1 })}
              className="w-24 shrink-0 rounded-xl border border-line bg-surface px-3 py-2.5 text-right text-sm tabular-nums outline-none transition-colors placeholder:text-muted/70 focus-visible:border-brand"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'removeItem', id: item.id })}
              disabled={state.items.length <= 1}
              aria-label={t('remove', { number: i + 1 })}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => dispatch({ type: 'addItem', id: rid() })}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-divide hover:text-divide"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t('add')}
      </button>

      <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
        <span className="text-sm font-medium text-muted">{t('total')}</span>
        <span className="font-display text-xl font-bold tabular-nums text-divide" aria-live="polite">
          {formatCents(total, locale)}
        </span>
      </div>
      <p className="text-xs text-muted">{t('hint')}</p>
    </section>
  );
}
