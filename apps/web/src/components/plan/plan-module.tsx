'use client';

import {
  Coffee,
  Landmark,
  Loader2,
  LocateFixed,
  type LucideIcon,
  MapPin,
  Minus,
  PartyPopper,
  Plus,
  Sparkles,
  Trees,
  Users,
  Utensils,
  Wine,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ApiError } from '@/lib/api-client';
import { fetchPlan } from '@/lib/api-client';
import {
  PLAN_BUDGETS,
  PLAN_CATEGORIES,
  PLAN_DURATIONS,
  type PlanBudget,
  type PlanCategory,
  type PlanDuration,
  type PlanResult,
} from '@/lib/plan/plan-types';
import { PlanResultView } from './plan-result';

const CATEGORY_ICONS: Record<PlanCategory, LucideIcon> = {
  COMIDA: Utensils,
  COPAS: Wine,
  CULTURA: Landmark,
  AIRE_LIBRE: Trees,
  FIESTA: PartyPopper,
  TRANQUILO: Coffee,
  SORPRESA: Sparkles,
};

const MIN_PARTY = 1;
const MAX_PARTY = 50;

type Phase = 'form' | 'loading' | 'result';
type GeoStatus = 'idle' | 'locating' | 'denied' | 'unsupported';
type ErrorKind = 'unavailable' | 'network' | 'generic';

export function PlanModule() {
  const t = useTranslations('plan');
  const locale = useLocale();

  const [phase, setPhase] = useState<Phase>('form');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [partySize, setPartySize] = useState(2);
  const [category, setCategory] = useState<PlanCategory>('COMIDA');
  const [budget, setBudget] = useState<PlanBudget>('MEDIO');
  const [duration, setDuration] = useState<PlanDuration>('UN_RATO');

  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<ErrorKind | null>(null);

  const ready = locationText.trim() !== '' || coords !== null;

  function geolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unsupported');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('idle');
      },
      () => setGeoStatus('denied'),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  async function generate() {
    setPhase('loading');
    setError(null);
    try {
      const result = await fetchPlan({
        partySize,
        category,
        budget,
        duration,
        locale,
        ...(locationText.trim() ? { locationText: locationText.trim() } : {}),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
      setResult(result);
      setPhase('result');
    } catch (e) {
      const err = e as ApiError;
      setError(err.status === 503 ? 'unavailable' : err.status === 0 ? 'network' : 'generic');
      setPhase('form');
    }
  }

  const header = (
    <header className="mb-6 flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-xl bg-plan/10 text-plan" aria-hidden="true">
        <MapPin className="size-6" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('name')}</h1>
        <p className="text-sm text-muted">{t('lead')}</p>
      </div>
    </header>
  );

  if (phase === 'loading') {
    return (
      <div className="py-8 sm:py-12">
        {header}
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-muted" aria-live="polite">
          <Loader2 className="size-7 animate-spin" aria-hidden="true" />
          <p className="text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="py-8 sm:py-12">
        {header}
        <PlanResultView result={result} onReset={() => setPhase('form')} />
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12">
      {header}
      <div className="space-y-6">
        {/* Ubicación */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t('locationLabel')}</legend>
          {coords ? (
            <div className="flex items-center justify-between rounded-xl border border-plan/40 bg-plan/5 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-plan">
                <LocateFixed className="size-4" aria-hidden="true" />
                {t('locationDetected')}
              </span>
              <button
                type="button"
                onClick={() => setCoords(null)}
                aria-label={t('clearLocation')}
                className="text-muted transition-colors hover:text-danger"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder={t('locationPlaceholder')}
                aria-label={t('locationLabel')}
                maxLength={120}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/70 focus-visible:border-plan"
              />
              <button
                type="button"
                onClick={geolocate}
                disabled={geoStatus === 'locating'}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-medium transition-colors hover:border-plan hover:text-plan disabled:opacity-60"
              >
                {geoStatus === 'locating' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LocateFixed className="size-4" aria-hidden="true" />
                )}
                {t('useMyLocation')}
              </button>
              {geoStatus === 'denied' && <p className="text-xs text-danger">{t('geoDenied')}</p>}
              {geoStatus === 'unsupported' && <p className="text-xs text-danger">{t('geoUnsupported')}</p>}
            </div>
          )}
        </fieldset>

        {/* Nº de personas */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t('partyLabel')}</legend>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPartySize((n) => Math.max(MIN_PARTY, n - 1))}
              disabled={partySize <= MIN_PARTY}
              aria-label={t('fewer')}
              className="grid size-10 place-items-center rounded-full border border-line transition-colors hover:border-plan disabled:opacity-30"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="inline-flex items-center gap-2 font-display text-2xl font-bold tabular-nums text-plan">
              <Users className="size-5 text-muted" aria-hidden="true" />
              {partySize}
            </span>
            <button
              type="button"
              onClick={() => setPartySize((n) => Math.min(MAX_PARTY, n + 1))}
              disabled={partySize >= MAX_PARTY}
              aria-label={t('more')}
              className="grid size-10 place-items-center rounded-full border border-line transition-colors hover:border-plan disabled:opacity-30"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        </fieldset>

        {/* Categoría */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t('categoryLabel')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLAN_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c];
              const on = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategory(c)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    on ? 'border-plan bg-plan/10 text-plan' : 'border-line hover:border-foreground/30'
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {t(`categories.${c}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Presupuesto */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t('budgetLabel')}</legend>
          <div className="grid grid-cols-3 gap-2">
            {PLAN_BUDGETS.map((b, i) => {
              const on = budget === b;
              return (
                <button
                  key={b}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setBudget(b)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    on ? 'border-plan bg-plan/10 text-plan' : 'border-line hover:border-foreground/30'
                  }`}
                >
                  <span aria-hidden="true">{'€'.repeat(i + 1)}</span>
                  <span className="ml-1.5">{t(`budgets.${b}`)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Tiempo disponible */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t('durationLabel')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLAN_DURATIONS.map((d) => {
              const on = duration === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDuration(d)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    on ? 'border-plan bg-plan/10 text-plan' : 'border-line hover:border-foreground/30'
                  }`}
                >
                  {t(`durations.${d}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error === 'unavailable' ? t('errorUnavailable') : error === 'network' ? t('errorNetwork') : t('errorGeneric')}
          </p>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={!ready}
          className="w-full rounded-xl bg-brand-deep px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('generate')}
        </button>
        {!ready && <p className="text-center text-xs text-muted">{t('needLocation')}</p>}
      </div>
    </div>
  );
}
