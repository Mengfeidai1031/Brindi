import { Brain, Dices, Hand, Layers, RotateCw, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ModulePage } from '@/components/module-page';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'decide' });
  return { title: t('name'), description: t('lead') };
}

export default function DecidePage() {
  return (
    <ModulePage
      ns="decide"
      Icon={Dices}
      accent={{ iconBox: 'bg-decide/10 text-decide', chip: 'bg-decide/10 text-decide', feature: 'text-decide' }}
      features={[
        { key: 'roulette', Icon: RotateCw },
        { key: 'cards', Icon: Layers },
        { key: 'touch', Icon: Hand },
        { key: 'groupQuiz', Icon: Users },
        { key: 'trivia', Icon: Brain },
      ]}
    />
  );
}
