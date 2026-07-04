'use client';

import { Plus, X } from 'lucide-react';
import { segmentColor } from '@/lib/decide/roulette';

export interface DecideOption {
  id: string;
  label: string;
}

/** Editor reutilizable de una lista de opciones (mínimo 2). */
export function OptionsEditor({
  options,
  onAdd,
  onRemove,
  onRename,
  placeholder,
  addLabel,
  removeLabel,
  max = 12,
}: {
  options: DecideOption[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  placeholder: (index: number) => string;
  addLabel: string;
  removeLabel: (index: number) => string;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {options.map((option, i) => (
          <li key={option.id} className="flex items-center gap-2">
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: segmentColor(i) }}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <input
              type="text"
              value={option.label}
              onChange={(e) => onRename(option.id, e.target.value)}
              placeholder={placeholder(i)}
              aria-label={placeholder(i)}
              maxLength={40}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/70 focus-visible:border-brand"
            />
            <button
              type="button"
              onClick={() => onRemove(option.id)}
              disabled={options.length <= 2}
              aria-label={removeLabel(i)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        disabled={options.length >= max}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-decide hover:text-decide disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}
