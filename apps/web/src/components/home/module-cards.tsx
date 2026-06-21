'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Dices, MapPinned, ReceiptText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/*
 * Firma visual del home: las tres tarjetas entran con una leve
 * inclinación que se asienta, como copas que brindan. La rotación se
 * desactiva automáticamente con prefers-reduced-motion (MotionConfig).
 */
const modules = [
  { key: 'divide', href: '/divide', Icon: ReceiptText, tilt: -2.5, iconClass: 'bg-divide/10 text-divide', ctaClass: 'text-divide' },
  { key: 'decide', href: '/decide', Icon: Dices, tilt: 2, iconClass: 'bg-decide/10 text-decide', ctaClass: 'text-decide' },
  { key: 'plan', href: '/plan', Icon: MapPinned, tilt: -2, iconClass: 'bg-plan/10 text-plan', ctaClass: 'text-plan' },
] as const;

export function ModuleCards() {
  const t = useTranslations('home');

  return (
    <section aria-labelledby="modules-heading">
      <h2 id="modules-heading" className="sr-only">
        {t('modulesHeading')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.key}
            initial={{ opacity: 0, y: 24, rotate: mod.tilt }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 180, damping: 18 }}
            whileHover={{ y: -4 }}
            className="h-full"
          >
            <Link
              href={mod.href}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-foreground/20"
            >
              <span className={`grid size-12 place-items-center rounded-xl ${mod.iconClass}`} aria-hidden="true">
                <mod.Icon className="size-6" />
              </span>
              <h3 className="font-display text-xl font-bold">{t(`modules.${mod.key}.name`)}</h3>
              <p className="text-sm leading-relaxed text-muted">{t(`modules.${mod.key}.description`)}</p>
              <span className={`mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold ${mod.ctaClass}`}>
                {t('open')}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
