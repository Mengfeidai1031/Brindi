import { getTranslations } from 'next-intl/server';
import { GroupQuizGame } from '@/components/decide/group-quiz-game';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'decide.group' });
  return { title: t('heading'), description: t('description') };
}

export default function GroupQuizPage() {
  return <GroupQuizGame />;
}
