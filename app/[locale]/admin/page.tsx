import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { adminCookieName, isAdminTokenValid } from '@/lib/auth';
import { getMessages, isLocale } from '@/lib/i18n';
import { listRequests } from '@/lib/store';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AdminLogin } from '@/components/admin-login';

export default function AdminPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  const messages = getMessages(params.locale);
  const token = cookies().get(adminCookieName())?.value;
  const authenticated = isAdminTokenValid(token);

  return (
    <div className="app-shell">
      <SiteHeader locale={params.locale} />
      <main className="container page-grid">
        <section className="panel">
          <h1>{messages.adminTitle}</h1>
          {authenticated ? <AdminDashboard locale={params.locale} requests={listRequests()} /> : <AdminLogin locale={params.locale} />}
        </section>
      </main>
    </div>
  );
}
