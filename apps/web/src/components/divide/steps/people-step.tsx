'use client';

import { Plus, UserRound, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { rid, useDivide } from '../divide-context';

export function PeopleStep() {
  const t = useTranslations('divide.steps.people');
  const { state, dispatch } = useDivide();

  return (
    <section aria-labelledby="people-heading" className="space-y-4">
      <div>
        <h2 id="people-heading" className="font-display text-lg font-bold">
          {t('heading')}
        </h2>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>

      <ul className="space-y-2">
        {state.people.map((person, i) => (
          <li key={person.id} className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-divide/10 text-divide" aria-hidden="true">
              <UserRound className="size-4" />
            </span>
            <input
              type="text"
              value={person.name}
              onChange={(e) => dispatch({ type: 'renamePerson', id: person.id, name: e.target.value })}
              placeholder={t('placeholder', { number: i + 1 })}
              aria-label={t('placeholder', { number: i + 1 })}
              maxLength={40}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/70 focus-visible:border-brand"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'removePerson', id: person.id })}
              disabled={state.people.length <= 2}
              aria-label={t('remove', { number: i + 1 })}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => dispatch({ type: 'addPerson', id: rid() })}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-divide hover:text-divide"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t('add')}
      </button>
    </section>
  );
}
