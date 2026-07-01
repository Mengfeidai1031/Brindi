'use client';

import { ArrowLeft, ArrowRight, ReceiptText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDivide } from './divide-context';
import { PeopleStep } from './steps/people-step';
import { ItemsStep } from './steps/items-step';
import { ModeStep } from './steps/mode-step';
import { ResultStep } from './steps/result-step';
import { Stepper } from './stepper';
import { canLeaveStep } from '@/lib/divide/selectors';

export function DivideWizard() {
  const t = useTranslations('divide');
  const { state, dispatch } = useDivide();
  const isLast = state.step === 3;
  const canAdvance = canLeaveStep(state, state.step);

  return (
    <div className="py-6 sm:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-divide/10 text-divide" aria-hidden="true">
          <ReceiptText className="size-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('name')}</h1>
          <p className="text-sm text-muted">{t('lead')}</p>
        </div>
      </header>

      <Stepper step={state.step} />

      <div className="mt-6">
        {state.step === 0 && <PeopleStep />}
        {state.step === 1 && <ItemsStep />}
        {state.step === 2 && <ModeStep />}
        {state.step === 3 && <ResultStep />}
      </div>

      {!isLast && (
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'back' })}
            disabled={state.step === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium transition-colors hover:border-foreground/30 disabled:invisible"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('nav.back')}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'next' })}
            disabled={!canAdvance}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.step === 2 ? t('nav.seeResult') : t('nav.next')}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
