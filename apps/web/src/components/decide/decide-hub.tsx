import { ArrowRight, Brain, Disc3, Hand, Layers, Users, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const GAMES: { key: string; href: string; Icon: LucideIcon }[] = [
  { key: 'roulette', href: '/decide/roulette', Icon: Disc3 },
  { key: 'cards', href: '/decide/cards', Icon: Layers },
  { key: 'touch', href: '/decide/touch', Icon: Hand },
  { key: 'group', href: '/decide/group', Icon: Users },
  { key: 'trivia', href: '/decide/trivia', Icon: Brain },
];

export async function DecideHub() {
  const t = await getTranslations('decide');

  return (
    <div className="py-8 sm:py-12">
      <header className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-decide/10 text-decide" aria-hidden="true">
          <Disc3 className="size-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t('name')}</h1>
          <p className="text-sm text-muted">{t('hub.subtitle')}</p>
        </div>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {GAMES.map(({ key, href, Icon }) => (
          <li key={key}>
            <Link
              href={href}
              className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-decide/40"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-decide/10 text-decide" aria-hidden="true">
                <Icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold">{t(`games.${key}.name`)}</h2>
                <p className="text-sm text-muted">{t(`games.${key}.tagline`)}</p>
              </div>
              <ArrowRight
                className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-decide"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
