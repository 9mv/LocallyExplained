import { SiteHeader } from '@/components/site-header';
import { getMessages, isLocale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/session';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WhoWeArePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);
  const currentUser = await getCurrentUser();

  return (
    <div className="app-shell">
      <SiteHeader locale={locale} currentUser={currentUser} />
      <main className="container page-grid">
        <section className="panel">
          <h1>{messages.whoWeAreTitle}</h1>
          <p>
            Placeholder text for the project or organization. This page will later describe the mission, contributors, and local knowledge workflow.
          </p>
        </section>
      </main>
    </div>
  );
}
