import { getTranslations } from 'next-intl/server';
import { TriviaGame } from '@/components/decide/trivia-game';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'decide.trivia' });
  return { title: t('heading'), description: t('description') };
}

export default function TriviaPage() {
  return <TriviaGame />;
}
