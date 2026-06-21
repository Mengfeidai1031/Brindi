'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const words = [
  { key: 'divide', className: 'text-divide' },
  { key: 'decide', className: 'text-decide' },
  { key: 'plan', className: 'text-plan' },
] as const;

export function Hero() {
  const t = useTranslations('home');

  return (
    <section className="pt-6 text-center sm:pt-10" aria-labelledby="hero-title">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-semibold uppercase tracking-[0.18em] text-muted sm:text-sm"
      >
        {t('kicker')}
      </motion.p>
      <h1 id="hero-title" className="mt-3 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
        {words.map((word, i) => (
          <motion.span
            key={word.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.09, type: 'spring', stiffness: 260, damping: 22 }}
            className={`inline-block px-1 ${word.className}`}
          >
            {t(`tagline.${word.key}`)}
          </motion.span>
        ))}
      </h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mx-auto mt-5 max-w-xl text-balance text-base text-muted sm:text-lg"
      >
        {t('subtitle')}
      </motion.p>
    </section>
  );
}
