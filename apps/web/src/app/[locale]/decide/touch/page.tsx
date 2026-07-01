import { getTranslations } from 'next-intl/server';
import { TouchGame } from '@/components/decide/touch-game';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'decide.touch' });
  return { title: t('heading') };
}

export default function TouchPage() {
  return <TouchGame />;
}
