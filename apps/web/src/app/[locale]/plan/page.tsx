import { MapPin, MapPinned, Navigation, SlidersHorizontal, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ModulePage } from '@/components/module-page';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'plan' });
  return { title: t('name'), description: t('lead') };
}

export default function PlanPage() {
  return (
    <ModulePage
      ns="plan"
      Icon={MapPinned}
      accent={{ iconBox: 'bg-plan/10 text-plan', chip: 'bg-plan/10 text-plan', feature: 'text-plan' }}
      features={[
        { key: 'location', Icon: MapPin },
        { key: 'prefs', Icon: SlidersHorizontal },
        { key: 'ai', Icon: Sparkles },
        { key: 'directions', Icon: Navigation },
      ]}
    />
  );
}
