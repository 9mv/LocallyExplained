import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { StoryReader } from '@/components/story-reader';
import { isLocale } from '@/lib/i18n';
import { getStorypoint } from '@/lib/store';

export default function StorypointPage({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  const storypoint = getStorypoint(params.id);

  if (!storypoint) {
    notFound();
  }

  return (
    <div className="app-shell">
      <SiteHeader locale={params.locale} />
      <main className="container page-grid">
        <StoryReader locale={params.locale} storypoint={storypoint} backHref={`/${params.locale}`} />
      </main>
    </div>
  );
}
