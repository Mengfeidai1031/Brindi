'use client';

import { CheckCircle2, LogOut, Mail, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Field } from '@/components/auth/field';
import { useRouter } from '@/i18n/navigation';
import { type ApiError, deleteMe, logout, updateMe } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function AccountView() {
  const t = useTranslations('account');
  const format = useFormatter();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState(user?.name ?? '');
  const [paymentLink, setPaymentLink] = useState(user?.paymentLink ?? '');
  const [nameError, setNameError] = useState<string>();
  const [linkError, setLinkError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const trimmedLink = paymentLink.trim();
  const dirty =
    name.trim() !== user.name || (trimmedLink.length > 0 ? trimmedLink : null) !== (user.paymentLink ?? null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setNameError(undefined);
    setLinkError(undefined);
    setSaveError(null);
    setSaved(false);

    let ok = true;
    if (name.trim().length === 0) {
      setNameError(t('profile.nameRequired'));
      ok = false;
    }
    if (trimmedLink.length > 0 && !/^https:\/\//i.test(trimmedLink)) {
      setLinkError(t('profile.paymentLinkInvalid'));
      ok = false;
    }
    if (!ok) return;

    setSaving(true);
    try {
      await updateMe({ name: name.trim(), paymentLink: trimmedLink.length > 0 ? trimmedLink : null });
      setSaved(true);
    } catch (err) {
      const api = err as ApiError;
      setSaveError(api.status === 400 ? t('profile.paymentLinkInvalid') : t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMe();
      router.replace('/');
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8 py-8 sm:py-12">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted">{t('subtitle')}</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">{t('session.title')}</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <dt className="sr-only">{t('session.email')}</dt>
            <dd className="break-all">{user.email}</dd>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-muted">
            <dt>{t('session.memberSince')}:</dt>
            <dd>{format.dateTime(new Date(user.createdAt), { dateStyle: 'long' })}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-medium transition-colors hover:border-foreground/30"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t('session.logout')}
        </button>
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">{t('profile.title')}</h2>
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <Field
            label={t('profile.name')}
            value={name}
            onChange={(v) => {
              setName(v);
              setSaved(false);
            }}
            error={nameError}
            autoComplete="name"
            maxLength={100}
          />
          <Field
            label={t('profile.paymentLink')}
            type="url"
            value={paymentLink}
            onChange={(v) => {
              setPaymentLink(v);
              setSaved(false);
            }}
            error={linkError}
            hint={t('profile.paymentLinkHint')}
            placeholder={t('profile.paymentLinkPlaceholder')}
            maxLength={255}
          />
          {saveError && (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {saveError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !dirty}
              className="rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                <CheckCircle2 className="size-4 text-divide" aria-hidden="true" />
                {t('profile.saved')}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-danger/30 bg-danger/5 p-5">
        <h2 className="font-display text-lg font-bold text-danger">{t('danger.title')}</h2>
        <p className="text-sm text-muted">{t('danger.description')}</p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-danger/50 px-3.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t('danger.delete')}
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-danger/40 bg-surface p-4">
            <p className="text-sm font-medium">{t('danger.confirmText')}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-danger-solid px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {deleting ? t('danger.deleting') : t('danger.confirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-foreground/30"
              >
                {t('danger.cancel')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
