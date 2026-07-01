import { getTranslations } from 'next-intl/server';
import { RouletteGame } from '@/components/decide/roulette-game';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'decide.roulette' });
  return { title: t('heading') };
}

export default function RoulettePage() {
  return <RouletteGame />;
}
