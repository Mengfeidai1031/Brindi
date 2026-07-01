'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { pickIndex } from '@/lib/decide/random';
import { segmentColor } from '@/lib/decide/roulette';
import { GameShell } from './game-shell';

interface Touch {
  x: number;
  y: number;
}

const COUNTDOWN_START = 3;
const TICK_MS = 800;

export function TouchGame() {
  const t = useTranslations('decide.touch');
  const areaRef = useRef<HTMLDivElement>(null);

  const [pointers, setPointers] = useState<Map<number, Touch>>(new Map());
  const pointersRef = useRef(pointers);
  pointersRef.current = pointers;

  const [chosen, setChosen] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);

  function relative(e: ReactPointerEvent): Touch {
    const rect = areaRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }

  function addPointer(e: ReactPointerEvent) {
    if (chosen !== null) return; // tras elegir, esperar a reiniciar
    setPointers((prev) => {
      const next = new Map(prev);
      next.set(e.pointerId, relative(e));
      return next;
    });
  }

  function movePointer(e: ReactPointerEvent) {
    setPointers((prev) => {
      if (!prev.has(e.pointerId)) return prev;
      const next = new Map(prev);
      next.set(e.pointerId, relative(e));
      return next;
    });
  }

  function removePointer(e: ReactPointerEvent) {
    setPointers((prev) => {
      if (!prev.has(e.pointerId)) return prev;
      const next = new Map(prev);
      next.delete(e.pointerId);
      return next;
    });
  }

  // Cuenta atrás: se (re)inicia cuando cambia el nº de dedos; al llegar a 0 elige uno.
  useEffect(() => {
    if (chosen !== null || pointers.size < 2) {
      setCount(null);
      return;
    }
    setCount(COUNTDOWN_START);
    let remaining = COUNTDOWN_START;
    const id = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(id);
        const ids = [...pointersRef.current.keys()];
        if (ids.length >= 2) {
          const winner = ids[pickIndex(ids.length)];
          setChosen(winner);
          setCount(null);
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(180);
        } else {
          setCount(null);
        }
      } else {
        setCount(remaining);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pointers.size, chosen]);

  function reset() {
    setChosen(null);
    setCount(null);
    setPointers(new Map());
  }

  const entries = [...pointers.entries()];
  const empty = pointers.size === 0 && chosen === null;

  return (
    <GameShell title={t('heading')} description={t('description')}>
      <div
        ref={areaRef}
        onPointerDown={addPointer}
        onPointerMove={movePointer}
        onPointerUp={removePointer}
        onPointerCancel={removePointer}
        className="relative h-[60dvh] w-full touch-none select-none overflow-hidden rounded-3xl border-2 border-dashed border-line bg-surface"
      >
        {/* Mensaje guía / cuenta atrás / resultado */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
          {empty && <p className="max-w-xs text-sm text-muted">{t('instructions')}</p>}
          {chosen === null && count !== null && (
            <span className="font-display text-7xl font-extrabold text-decide tabular-nums">{count}</span>
          )}
          {chosen === null && count === null && pointers.size === 1 && (
            <p className="text-sm font-medium text-muted">{t('needMore')}</p>
          )}
          {chosen !== null && <p className="font-display text-2xl font-bold text-decide">{t('chosen')}</p>}
        </div>

        {/* Círculos de cada dedo */}
        {entries.map(([id, pos], i) => {
          const isChosen = chosen === id;
          const dimmed = chosen !== null && !isChosen;
          const size = isChosen ? 132 : 84;
          return (
            <span
              key={id}
              className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 font-display font-bold text-white transition-all duration-200"
              style={{
                left: pos.x,
                top: pos.y,
                width: size,
                height: size,
                backgroundColor: segmentColor(i),
                borderColor: isChosen ? 'var(--color-foreground)' : 'rgba(255,255,255,0.6)',
                opacity: dimmed ? 0.25 : 0.9,
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>

      {chosen !== null && (
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground/30"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('reset')}
        </button>
      )}
    </GameShell>
  );
}
