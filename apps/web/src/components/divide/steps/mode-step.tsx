'use client';

import { Equal, ListChecks, Percent, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { formatCents } from '@/lib/divide/money';
import type { SplitMode } from '@/lib/divide/types';
import {
  extrasSumCents,
  isPercentValid,
  parsedItems,
  percentSum,
  personLabel,
  totalCents,
} from '@/lib/divide/selectors';
import { useDivide } from '../divide-context';

const MODES: { mode: SplitMode; Icon: typeof Equal }[] = [
  { mode: 'equal', Icon: Equal },
  { mode: 'items', Icon: ListChecks },
  { mode: 'percentage', Icon: Percent },
  { mode: 'extra', Icon: Plus },
];

export function ModeStep() {
  const t = useTranslations('divide.steps.split');
  const { state, dispatch } = useDivide();

  return (
    <section aria-labelledby="split-heading" className="space-y-5">
      <div>
        <h2 id="split-heading" className="font-display text-lg font-bold">
          {t('heading')}
        </h2>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>

      <div role="radiogroup" aria-label={t('heading')} className="grid grid-cols-2 gap-3">
        {MODES.map(({ mode, Icon }) => {
          const selected = state.mode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => dispatch({ type: 'setMode', mode })}
              className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-left transition-colors ${
                selected ? 'border-divide bg-divide/5 ring-1 ring-divide' : 'border-line bg-surface hover:border-foreground/20'
              }`}
            >
              <Icon className={`size-5 ${selected ? 'text-divide' : 'text-muted'}`} aria-hidden="true" />
              <span className="font-medium">{t(`modes.${mode}.name`)}</span>
              <span className="text-xs leading-snug text-muted">{t(`modes.${mode}.desc`)}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        {state.mode === 'equal' && <EqualConfig />}
        {state.mode === 'items' && <ItemsConfig />}
        {state.mode === 'percentage' && <PercentageConfig />}
        {state.mode === 'extra' && <ExtraConfig />}
      </div>
    </section>
  );
}

function ConfigShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function EqualConfig() {
  const t = useTranslations('divide.steps.split.equal');
  const locale = useLocale();
  const { state } = useDivide();
  const each = state.people.length > 0 ? Math.round(totalCents(state) / state.people.length) : 0;

  return (
    <ConfigShell title={t('title')}>
      <p className="text-sm text-muted">
        {t('preview', { count: state.people.length, amount: formatCents(each, locale) })}
      </p>
    </ConfigShell>
  );
}

function ItemsConfig() {
  const t = useTranslations('divide.steps.split.items');
  const tBill = useTranslations('divide.steps.bill');
  const locale = useLocale();
  const { state, dispatch } = useDivide();
  const items = parsedItems(state);

  return (
    <ConfigShell title={t('title')}>
      <p className="text-sm text-muted">{t('description')}</p>
      <ul className="space-y-4">
        {state.items.map((item, i) => {
          const cents = items[i]?.cents ?? 0;
          const assignees = state.assignments[item.id] ?? [];
          const unassigned = cents > 0 && assignees.length === 0;
          return (
            <li key={item.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  {item.description.trim() || tBill('itemFallback', { number: i + 1 })}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted">{formatCents(cents, locale)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {state.people.map((person, pi) => {
                  const on = assignees.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => dispatch({ type: 'toggleAssignment', itemId: item.id, personId: person.id })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        on ? 'border-divide bg-divide/10 text-divide' : 'border-line text-muted hover:border-foreground/30'
                      }`}
                    >
                      {personLabel(person.name, pi, tBill('person'))}
                    </button>
                  );
                })}
              </div>
              {unassigned && <p className="text-xs font-medium text-danger">{t('unassigned')}</p>}
            </li>
          );
        })}
      </ul>
    </ConfigShell>
  );
}

function PercentageConfig() {
  const t = useTranslations('divide.steps.split.percentage');
  const tBill = useTranslations('divide.steps.bill');
  const { state, dispatch } = useDivide();
  const sum = percentSum(state);
  const valid = sum === 100 && state.people.every((p) => isPercentValid(state, p.id));

  return (
    <ConfigShell title={t('title')}>
      <ul className="space-y-2">
        {state.people.map((person, i) => {
          const ok = isPercentValid(state, person.id);
          return (
            <li key={person.id} className="flex items-center gap-2">
              <span className="w-full truncate text-sm">{personLabel(person.name, i, tBill('person'))}</span>
              <div className="relative shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  value={state.percentages[person.id] ?? ''}
                  onChange={(e) => dispatch({ type: 'setPercent', personId: person.id, value: e.target.value })}
                  aria-label={t('inputLabel', { name: personLabel(person.name, i, tBill('person')) })}
                  aria-invalid={!ok || undefined}
                  className={`w-20 rounded-xl border bg-background px-3 py-2 pr-7 text-right text-sm tabular-nums outline-none transition-colors focus-visible:border-brand ${
                    ok ? 'border-line' : 'border-danger'
                  }`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => dispatch({ type: 'evenPercents' })}
          className="text-sm font-medium text-brand hover:underline"
        >
          {t('even')}
        </button>
        <span className={`text-sm font-semibold tabular-nums ${valid ? 'text-divide' : 'text-danger'}`} aria-live="polite">
          {t('sum', { sum })}
        </span>
      </div>
    </ConfigShell>
  );
}

function ExtraConfig() {
  const t = useTranslations('divide.steps.split.extra');
  const tBill = useTranslations('divide.steps.bill');
  const locale = useLocale();
  const { state, dispatch } = useDivide();
  const total = totalCents(state);
  const extrasSum = extrasSumCents(state);
  const remaining = total - extrasSum;
  const over = extrasSum > total;

  return (
    <ConfigShell title={t('title')}>
      <p className="text-sm text-muted">{t('description')}</p>
      <ul className="space-y-2">
        {state.people.map((person, i) => (
          <li key={person.id} className="flex items-center gap-2">
            <span className="w-full truncate text-sm">{personLabel(person.name, i, tBill('person'))}</span>
            <input
              type="text"
              inputMode="decimal"
              value={state.extras[person.id] ?? ''}
              onChange={(e) => dispatch({ type: 'setExtra', personId: person.id, value: e.target.value })}
              placeholder="0"
              aria-label={t('inputLabel', { name: personLabel(person.name, i, tBill('person')) })}
              className="w-24 shrink-0 rounded-xl border border-line bg-background px-3 py-2 text-right text-sm tabular-nums outline-none transition-colors placeholder:text-muted/70 focus-visible:border-brand"
            />
          </li>
        ))}
      </ul>
      <p className={`text-sm ${over ? 'font-medium text-danger' : 'text-muted'}`} aria-live="polite">
        {over ? t('over') : t('remaining', { amount: formatCents(remaining, locale) })}
      </p>
    </ConfigShell>
  );
}
