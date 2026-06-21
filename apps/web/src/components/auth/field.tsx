'use client';

import { useId } from 'react';

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
}

/** Campo de formulario accesible: etiqueta asociada, pista y error con aria-describedby. */
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  error,
  hint,
  placeholder,
  autoComplete,
  maxLength,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus-visible:border-brand"
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
