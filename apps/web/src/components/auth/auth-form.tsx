'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { type ApiError, login, register } from '@/lib/api-client';
import { Field } from './field';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
  name?: string;
}

/** Un solo componente para iniciar sesión y registrarse (difieren en el campo nombre). */
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const section = isRegister ? 'register' : 'login';
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = t('errors.emailInvalid');
    if (password.length < 8) next.password = t('errors.passwordShort');
    if (isRegister && name.trim().length === 0) next.name = t('errors.nameRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({ email: email.trim(), password, name: name.trim(), locale });
      } else {
        await login({ email: email.trim(), password });
      }
      router.replace('/account');
    } catch (err) {
      const api = err as ApiError;
      // Mensajes localizados en cliente según el código (la API responde en es).
      if (isRegister && api.status === 409) {
        setFormError(t('errors.emailTaken'));
      } else if (!isRegister && api.status === 401) {
        setFormError(t('errors.invalidCredentials'));
      } else {
        setFormError(t('errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm py-10 sm:py-16">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{t(`${section}.title`)}</h1>
      <p className="mt-2 text-sm text-muted">{t(`${section}.subtitle`)}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {isRegister && (
          <Field
            label={t('fields.name')}
            value={name}
            onChange={setName}
            error={errors.name}
            placeholder={t('fields.namePlaceholder')}
            autoComplete="name"
            maxLength={100}
          />
        )}
        <Field
          label={t('fields.email')}
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          placeholder={t('fields.emailPlaceholder')}
          autoComplete="email"
          maxLength={254}
        />
        <Field
          label={t('fields.password')}
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          hint={isRegister ? t('fields.passwordHint') : undefined}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          maxLength={72}
        />

        {formError && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {submitting ? t(`${section}.submitting`) : t(`${section}.submit`)}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t(`${section}.${isRegister ? 'hasAccount' : 'noAccount'}`)}{' '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-semibold text-brand hover:underline"
        >
          {t(`${section}.${isRegister ? 'switchToLogin' : 'switchToRegister'}`)}
        </Link>
      </p>
    </div>
  );
}
