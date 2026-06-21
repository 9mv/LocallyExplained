import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { getMessages, isLocale } from '@/lib/i18n';
import { listRequests, listStorypoints } from '@/lib/store';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AccountCenter } from '@/components/account-center';
import { getCurrentUser } from '@/lib/session';
import Link from 'next/link';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);
  const currentUser = await getCurrentUser();
  const [requests, storypoints] = await Promise.all([listRequests(), listStorypoints()]);

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
          <div className="content-actions" style={{ marginBottom: 16 }}>
            <Link className="ghost-button" href={`/${locale}/admin`}>
              Overview
            </Link>
            <Link className="ghost-button" href={`/${locale}/admin/users`}>
              Users
            </Link>
          </div>
          <AdminDashboard locale={locale} requests={requests} storypoints={storypoints} />
        </section>
      </main>
    </div>
  );
}
