import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { getMessages, isLocale } from '@/lib/i18n';
import { listRequests, listStorypoints } from '@/lib/store';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AccountCenter } from '@/components/account-center';
import { getCurrentUser } from '@/lib/session';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="app-shell">
        <SiteHeader locale={locale} currentUser={currentUser} />
        <main className="container page-grid">
          <section className="panel">
            <h1>{messages.adminTitle}</h1>
            <AccountCenter locale={locale} currentUser={currentUser} requests={[]} favorites={[]} storypoints={[]} />
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <SiteHeader locale={locale} currentUser={currentUser} />
      <main className="container page-grid">
        <section className="panel">
          <h1>{messages.adminTitle}</h1>
          <AdminDashboard locale={locale} requests={listRequests()} storypoints={listStorypoints()} />
        </section>
      </main>
    </div>
  );
}
