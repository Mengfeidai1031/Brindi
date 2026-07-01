'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { SEGMENT_COLORS } from '@/lib/decide/roulette';

/** Ráfaga de confeti efímera. Respeta reduced-motion vía MotionConfig global. */
export function Confetti({ count = 36 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320,
        y: 140 + Math.random() * 220,
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.15,
        color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate }}
          transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 0.6,
            borderRadius: 2,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}
