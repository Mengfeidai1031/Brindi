'use client';

import { RotateCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import {
  computeTargetRotation,
  labelPosition,
  segmentColor,
  segmentPath,
} from '@/lib/decide/roulette';
import { pickIndex } from '@/lib/decide/random';
import { Confetti } from './confetti';
import { GameShell } from './game-shell';
import { type DecideOption, OptionsEditor } from './options-editor';

const SPIN_MS = 4500;
const CX = 110;
const CY = 110;
const R = 104;

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function initialOptions(): DecideOption[] {
  return [
    { id: rid(), label: '' },
    { id: rid(), label: '' },
    { id: rid(), label: '' },
  ];
}

export function RouletteGame() {
  const t = useTranslations('decide.roulette');
  const locale = useLocale();
  const reduced = usePrefersReducedMotion();

  const [options, setOptions] = useState<DecideOption[]>(() => initialOptions());
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const segments = options.length;

  function label(option: DecideOption, index: number): string {
    return option.label.trim() || t('optionFallback', { number: index + 1 });
  }

  function spin() {
    if (spinning) return;
    setWinner(null);
    const chosen = pickIndex(segments);
    const target = computeTargetRotation(rotation, chosen, segments, 5);
    setSpinning(true);
    setRotation(target);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Bajo reduced-motion la rueda salta al instante (CSS anula la transición).
    timeoutRef.current = setTimeout(
      () => {
        setSpinning(false);
        setWinner(chosen);
      },
      reduced ? 200 : SPIN_MS,
    );
  }

  return (
    <GameShell title={t('heading')} description={t('description')}>
      <div className="relative mx-auto mb-6 w-full max-w-[260px]">
        {winner !== null && <Confetti />}
        {/* Aguja fija en la parte superior */}
        <svg viewBox="0 0 220 232" className="w-full" role="img" aria-label={t('wheelLabel')}>
          <polygon points="110,6 100,26 120,26" fill="var(--color-foreground)" />
          <g
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${CX}px ${CY + 12}px`,
              transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.17, 0.67, 0.16, 1)` : 'none',
            }}
            transform="translate(0, 12)"
          >
            {options.map((option, i) => {
              const pos = labelPosition(i, segments, CX, CY, R * 0.62);
              return (
                <g key={option.id}>
                  <path d={segmentPath(i, segments, CX, CY, R)} fill={segmentColor(i)} stroke="var(--color-surface)" strokeWidth={1.5} />
                  <text
                    x={pos.x}
                    y={pos.y}
                    fill="#ffffff"
                    fontSize={segments > 8 ? 8 : 10}
                    fontWeight={700}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${pos.angle} ${pos.x} ${pos.y})`}
                  >
                    {label(option, i).slice(0, 12)}
                  </text>
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r={10} fill="var(--color-surface)" stroke="var(--color-line)" strokeWidth={1.5} />
          </g>
        </svg>
      </div>

      <div className="mb-6 min-h-12 text-center" aria-live="polite">
        {winner !== null ? (
          <p className="font-display text-xl font-bold">
            {t('result')}{' '}
            <span className="text-decide">{label(options[winner], winner)}</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-deep px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw className={`size-4 ${spinning ? 'animate-spin' : ''}`} aria-hidden="true" />
            {spinning ? t('spinning') : t('spin')}
          </button>
        )}
      </div>

      {winner !== null && (
        <div className="mb-6 text-center">
          <button
            type="button"
            onClick={spin}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground/30"
          >
            <RotateCw className="size-4" aria-hidden="true" />
            {t('spinAgain')}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">{t('optionsHeading')}</h2>
        <OptionsEditor
          options={options}
          onAdd={() => {
            setWinner(null);
            setOptions((prev) => [...prev, { id: rid(), label: '' }]);
          }}
          onRemove={(id) => {
            setWinner(null);
            setOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.id !== id) : prev));
          }}
          onRename={(id, value) => setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label: value } : o)))}
          placeholder={(i) => t('optionPlaceholder', { number: i + 1 })}
          addLabel={t('addOption')}
          removeLabel={(i) => t('removeOption', { number: i + 1 })}
        />
      </div>
    </GameShell>
  );
}
