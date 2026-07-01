'use client';

import { RotateCcw, Shuffle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { pickIndex, shuffle } from '@/lib/decide/random';
import { groupQuizPrompts } from '@/lib/decide/quiz-prompts';
import { segmentColor } from '@/lib/decide/roulette';
import { type DecideOption, OptionsEditor } from './options-editor';
import { GameShell } from './game-shell';

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function personName(option: DecideOption, index: number, fallback: string): string {
  return option.label.trim() || `${fallback} ${index + 1}`;
}

export function GroupQuizGame() {
  const t = useTranslations('decide.group');
  const locale = useLocale();

  const [started, setStarted] = useState(false);
  const [players, setPlayers] = useState<DecideOption[]>(() => [
    { id: rid(), label: '' },
    { id: rid(), label: '' },
  ]);

  // Baraja de preguntas mezclada una vez al empezar; se recorre en orden.
  const deck = useMemo(() => (started ? shuffle(groupQuizPrompts(locale)) : []), [started, locale]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  function nextPrompt() {
    setPicked(null);
    setPromptIndex((i) => (i + 1) % deck.length);
  }

  function decideAtRandom() {
    if (players.length === 0) return;
    setPicked(players[pickIndex(players.length)].id);
  }

  if (!started) {
    return (
      <GameShell title={t('heading')} description={t('description')}>
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">{t('playersHeading')}</h2>
            <OptionsEditor
              options={players}
              onAdd={() => setPlayers((p) => [...p, { id: rid(), label: '' }])}
              onRemove={(id) => setPlayers((p) => (p.length > 2 ? p.filter((o) => o.id !== id) : p))}
              onRename={(id, value) => setPlayers((p) => p.map((o) => (o.id === id ? { ...o, label: value } : o)))}
              placeholder={(i) => t('playerPlaceholder', { number: i + 1 })}
              addLabel={t('addPlayer')}
              removeLabel={(i) => t('removePlayer', { number: i + 1 })}
            />
          </div>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="w-full rounded-xl bg-brand-deep px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {t('start')}
          </button>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell title={t('heading')} description={t('description')}>
      <div className="space-y-6">
        <div className="grid min-h-32 place-items-center rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="font-display text-2xl font-bold">{deck[promptIndex]}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {players.map((player, i) => {
            const on = picked === player.id;
            return (
              <button
                key={player.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(on ? null : player.id)}
                className="rounded-full border px-4 py-2 text-sm font-medium text-white transition-transform"
                style={{
                  backgroundColor: segmentColor(i),
                  borderColor: on ? 'var(--color-foreground)' : 'transparent',
                  transform: on ? 'scale(1.06)' : 'none',
                  opacity: picked && !on ? 0.45 : 1,
                }}
              >
                {personName(player, i, t('player'))}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={nextPrompt}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-deep px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Shuffle className="size-4" aria-hidden="true" />
            {t('nextPrompt')}
          </button>
          <button
            type="button"
            onClick={decideAtRandom}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-medium transition-colors hover:border-foreground/30"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {t('decideRandom')}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
