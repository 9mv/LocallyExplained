import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { StoryReader } from '@/components/story-reader';
import { isLocale } from '@/lib/i18n';
import { getStorypoint } from '@/lib/store';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function StorypointPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const storypoint = await getStorypoint(id);
  const currentUser = await getCurrentUser();

  if (!storypoint) {
    notFound();
  }

  const isFavorite = currentUser?.favoriteStorypointIds.includes(storypoint.id) ?? false;

  return (
    <div className="app-shell">
      <SiteHeader locale={locale} currentUser={currentUser} />
      <main className="container page-grid">
        <StoryReader
          locale={locale}
          storypoint={storypoint}
          currentUser={currentUser}
          isFavorite={isFavorite}
          backHref={`/${locale}`}
        />
      </main>
    </div>
  );
}
