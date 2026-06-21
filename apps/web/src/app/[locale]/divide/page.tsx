import { Camera, Keyboard, Percent, ReceiptText, Share2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ModulePage } from '@/components/module-page';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'divide' });
  return { title: t('name'), description: t('lead') };
}

export default function DividePage() {
  return (
    <ModulePage
      ns="divide"
      Icon={ReceiptText}
      accent={{ iconBox: 'bg-divide/10 text-divide', chip: 'bg-divide/10 text-divide', feature: 'text-divide' }}
      features={[
        { key: 'ocr', Icon: Camera },
        { key: 'manual', Icon: Keyboard },
        { key: 'modes', Icon: Percent },
        { key: 'share', Icon: Share2 },
      ]}
    />
  );
}
