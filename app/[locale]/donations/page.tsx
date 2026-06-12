import { SiteHeader } from '@/components/site-header';
import { getMessages, isLocale } from '@/lib/i18n';
import { notFound } from 'next/navigation';

export default function DonationsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  const messages = getMessages(params.locale);

  return (
    <div className="app-shell">
      <SiteHeader locale={params.locale} />
      <main className="container page-grid">
        <section className="panel">
          <h1>{messages.donationsTitle}</h1>
          <p>
            Donation placeholder. Add a PayPal donate widget, a Stripe payment link, or an embedded checkout when the fundraising flow is defined.
          </p>
          <div className="notice">Recommended future option: Stripe Payment Link with a small recurring donation tier.</div>
        </section>
      </main>
    </div>
  );
}
