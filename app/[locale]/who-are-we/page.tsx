import { SiteHeader } from '@/components/site-header';
import { getMessages, isLocale } from '@/lib/i18n';
import { notFound } from 'next/navigation';

export default function WhoWeArePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  const messages = getMessages(params.locale);

  return (
    <div className="app-shell">
      <SiteHeader locale={params.locale} />
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
