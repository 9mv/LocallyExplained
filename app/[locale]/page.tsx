import { notFound } from 'next/navigation';
import { HomeClient } from '@/components/home-client';
import { SiteHeader } from '@/components/site-header';
import { isLocale } from '@/lib/i18n';
import { listStorypoints } from '@/lib/store';
import { getCurrentUser } from '@/lib/session';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  return (
    <div className="app-shell">
      <SiteHeader locale={locale} currentUser={currentUser} />
      <HomeClient locale={locale} storypoints={listStorypoints()} currentUser={currentUser} />
    </div>
  );
}
