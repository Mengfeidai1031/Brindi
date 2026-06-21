import { getTranslations } from 'next-intl/server';
import { AuthForm } from '@/components/auth/auth-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.login' });
  return { title: t('title') };
}

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
