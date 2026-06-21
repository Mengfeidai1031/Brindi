import { Hero } from '@/components/home/hero';
import { ModuleCards } from '@/components/home/module-cards';
import { PrivacyNote } from '@/components/home/privacy-note';

export default function HomePage() {
  return (
    <div className="space-y-10 py-8 sm:space-y-14 sm:py-12">
      <Hero />
      <ModuleCards />
      <PrivacyNote />
    </div>
  );
}
