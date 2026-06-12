import { notFound } from 'next/navigation';
import { HomeClient } from '@/components/home-client';
import { SiteHeader } from '@/components/site-header';
import { isLocale } from '@/lib/i18n';
import { listStorypoints } from '@/lib/store';

export default function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  return (
    <div className="app-shell">
      <SiteHeader locale={params.locale} />
      <HomeClient locale={params.locale} storypoints={listStorypoints()} />
    </div>
  );
}
