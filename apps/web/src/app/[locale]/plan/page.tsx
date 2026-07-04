import { getTranslations } from 'next-intl/server';
import { PlanModule } from '@/components/plan/plan-module';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'plan' });
  return { title: t('name'), description: t('lead') };
}

export default function PlanPage() {
  return <PlanModule />;
}
