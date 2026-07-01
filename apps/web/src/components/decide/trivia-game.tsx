'use client';

import { Check, Loader2, RotateCcw, WifiOff, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { fetchQuiz } from '@/lib/api-client';
import { getOfflineQuestions } from '@/lib/decide/quiz-fallback';
import {
  QUIZ_CATEGORIES,
  QUIZ_LEVELS,
  type QuizCategory,
  type QuizLevel,
  type QuizQuestion,
  type QuizSource,
} from '@/lib/decide/quiz-types';
import { GameShell } from './game-shell';

const MIN_Q = 3;
const MAX_Q = 20;

type Phase = 'setup' | 'loading' | 'playing' | 'done';

export function TriviaGame() {
  const t = useTranslations('decide.trivia');
  const locale = useLocale();

  const [phase, setPhase] = useState<Phase>('setup');
  const [category, setCategory] = useState<QuizCategory>('RANDOM');
  const [level, setLevel] = useState<QuizLevel>('FACIL');
  const [count, setCount] = useState(5);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [source, setSource] = useState<QuizSource>('ai');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [loadError, setLoadError] = useState(false);

  async function start() {
    setPhase('loading');
    setLoadError(false);
    try {
      const result = await fetchQuiz({ category, level, count, locale });
      if (result.questions.length === 0) throw new Error('empty');
      beginPlay(result.questions, result.source);
    } catch {
      // Sin conexión o API caída: banco local empaquetado.
      const offline = getOfflineQuestions(category, count);
      if (offline.length === 0) {
        setLoadError(true);
        setPhase('setup');
        return;
      }
      beginPlay(offline, 'offline');
    }
  }

  function beginPlay(qs: QuizQuestion[], src: QuizSource) {
    setQuestions(qs);
    setSource(src);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setPhase('playing');
  }

  function choose(option: number) {
    if (selected !== null) return;
    setSelected(option);
    if (option === questions[index].correctIndex) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase('done');
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  // --- Configuración ---
  if (phase === 'setup') {
    return (
      <GameShell title={t('heading')} description={t('description')}>
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t('categoryLabel')}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUIZ_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    category === c ? 'border-decide bg-decide/10 text-decide' : 'border-line hover:border-foreground/30'
                  }`}
                >
                  {t(`categories.${c}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t('levelLabel')}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUIZ_LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={level === l}
                  onClick={() => setLevel(l)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    level === l ? 'border-decide bg-decide/10 text-decide' : 'border-line hover:border-foreground/30'
                  }`}
                >
                  {t(`levels.${l}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t('countLabel')}</legend>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={MIN_Q}
                max={MAX_Q}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                aria-label={t('countLabel')}
                className="h-2 w-full cursor-pointer accent-decide"
              />
              <span className="w-8 text-center font-display text-xl font-bold tabular-nums text-decide">{count}</span>
            </div>
          </fieldset>

          {loadError && (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {t('loadError')}
            </p>
          )}

          <button
            type="button"
            onClick={start}
            className="w-full rounded-xl bg-brand-deep px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {t('start')}
          </button>
        </div>
      </GameShell>
    );
  }

  // --- Carga ---
  if (phase === 'loading') {
    return (
      <GameShell title={t('heading')} description={t('description')}>
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-muted" aria-live="polite">
          <Loader2 className="size-7 animate-spin" aria-hidden="true" />
          <p className="text-sm">{t('loading')}</p>
        </div>
      </GameShell>
    );
  }

  // --- Resultado final ---
  if (phase === 'done') {
    return (
      <GameShell title={t('heading')} description={t('description')}>
        <div className="space-y-6 py-6 text-center">
          <p className="text-sm text-muted">{t('finalScore')}</p>
          <p className="font-display text-5xl font-extrabold text-decide">
            {score}
            <span className="text-2xl text-muted">/{questions.length}</span>
          </p>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-deep px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {t('playAgain')}
          </button>
        </div>
      </GameShell>
    );
  }

  // --- Jugando ---
  const q = questions[index];
  return (
    <GameShell title={t('heading')} description={t('description')}>
      <div className="space-y-5">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{t('progress', { current: index + 1, total: questions.length })}</span>
          <span className="font-semibold">{t('scoreShort', { score })}</span>
        </div>

        {source !== 'ai' && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-muted/10 px-2.5 py-1 text-xs text-muted">
            <WifiOff className="size-3.5" aria-hidden="true" />
            {source === 'offline' ? t('offlineNote') : t('fallbackNote')}
          </p>
        )}

        <h2 className="font-display text-xl font-bold">{q.question}</h2>

        <ul className="space-y-2">
          {q.options.map((option, i) => {
            const isCorrect = i === q.correctIndex;
            const isPicked = selected === i;
            const reveal = selected !== null;
            let style = 'border-line hover:border-foreground/30';
            if (reveal && isCorrect) style = 'border-divide bg-divide/10 text-divide';
            else if (reveal && isPicked) style = 'border-danger bg-danger/10 text-danger';
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => choose(i)}
                  disabled={reveal}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${style}`}
                >
                  <span>{option}</span>
                  {reveal && isCorrect && <Check className="size-4 shrink-0" aria-hidden="true" />}
                  {reveal && isPicked && !isCorrect && <X className="size-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>

        {selected !== null && (
          <div className="space-y-4">
            {q.explanation && (
              <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">{q.explanation}</p>
            )}
            <button
              type="button"
              onClick={next}
              className="w-full rounded-xl bg-brand-deep px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {index + 1 >= questions.length ? t('seeScore') : t('next')}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
