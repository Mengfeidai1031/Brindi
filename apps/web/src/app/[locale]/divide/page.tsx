import { getTranslations } from 'next-intl/server';
import { DivideProvider } from '@/components/divide/divide-context';
import { DivideWizard } from '@/components/divide/divide-wizard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'divide' });
  return { title: t('name'), description: t('lead') };
}

export default function DividePage() {
  return (
    <DivideProvider>
      <DivideWizard />
    </DivideProvider>
  );
}
