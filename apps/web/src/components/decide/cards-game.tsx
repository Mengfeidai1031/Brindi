'use client';

import { Crown, Minus, Plus, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { pickIndex } from '@/lib/decide/random';
import { GameShell } from './game-shell';

const MIN_CARDS = 2;
const MAX_CARDS = 8;

interface CardState {
  flipped: boolean;
}

export function CardsGame() {
  const t = useTranslations('decide.cards');

  const [count, setCount] = useState(4);
  const [markedIndex, setMarkedIndex] = useState<number | null>(null);
  const [cards, setCards] = useState<CardState[]>([]);

  const dealt = markedIndex !== null;
  const found = dealt && cards[markedIndex]?.flipped;

  function deal(n: number) {
    setMarkedIndex(pickIndex(n));
    setCards(Array.from({ length: n }, () => ({ flipped: false })));
  }

  function flip(index: number) {
    if (!dealt || cards[index].flipped || found) return;
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, flipped: true } : c)));
  }

  return (
    <GameShell title={t('heading')} description={t('description')}>
      {!dealt ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="mb-3 text-sm font-medium">{t('countLabel')}</p>
            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(MIN_CARDS, c - 1))}
                disabled={count <= MIN_CARDS}
                aria-label={t('fewer')}
                className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:border-decide disabled:opacity-30"
              >
                <Minus className="size-5" aria-hidden="true" />
              </button>
              <span className="w-12 text-center font-display text-4xl font-extrabold tabular-nums text-decide">{count}</span>
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(MAX_CARDS, c + 1))}
                disabled={count >= MAX_CARDS}
                aria-label={t('more')}
                className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:border-decide disabled:opacity-30"
              >
                <Plus className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => deal(count)}
            className="w-full rounded-xl bg-brand-deep px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {t('deal')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="min-h-6 text-center text-sm font-medium" aria-live="polite">
            {found ? <span className="text-decide">{t('found')}</span> : t('flipHint')}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((card, i) => {
              const isMarked = i === markedIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => flip(i)}
                  disabled={card.flipped || found}
                  aria-label={card.flipped ? (isMarked ? t('found') : t('blank')) : t('cardLabel', { number: i + 1 })}
                  className={`grid aspect-[3/4] place-items-center rounded-2xl border-2 text-center transition-colors ${
                    card.flipped
                      ? isMarked
                        ? 'border-decide bg-decide/10'
                        : 'border-line bg-surface'
                      : 'border-transparent bg-brand-deep text-white hover:brightness-110'
                  }`}
                >
                  {card.flipped ? (
                    isMarked ? (
                      <Crown className="size-9 text-decide" aria-hidden="true" />
                    ) : (
                      <span className="text-2xl text-muted" aria-hidden="true">
                        ·
                      </span>
                    )
                  ) : (
                    <span className="font-display text-2xl font-bold" aria-hidden="true">
                      ?
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => deal(cards.length)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground/30"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {t('redeal')}
          </button>
        </div>
      )}
    </GameShell>
  );
}
