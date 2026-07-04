import { getTranslations } from 'next-intl/server';
import { DecideHub } from '@/components/decide/decide-hub';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'decide' });
  return { title: t('name'), description: t('lead') };
}

export default function DecidePage() {
  return <DecideHub />;
}
