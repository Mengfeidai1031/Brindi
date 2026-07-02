import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.register' });
  return { title: t('title') };
}

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
