import { getTranslations } from 'next-intl/server';
import { CardsGame } from '@/components/decide/cards-game';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'decide.cards' });
  return { title: t('heading') };
}

export default function CardsPage() {
  return <CardsGame />;
}
