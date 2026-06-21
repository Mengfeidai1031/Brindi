import { getTranslations } from 'next-intl/server';
import { AccountGuard } from '@/components/account/account-guard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('title') };
}

export default function AccountPage() {
  return <AccountGuard />;
}
