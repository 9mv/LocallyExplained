import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { getMessages, isLocale } from '@/lib/i18n';
import { listUsers } from '@/lib/store';
import { getCurrentUser } from '@/lib/session';
import { AdminUsersPanel } from '@/components/admin-users-panel';

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
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
            <p>{messages.adminLogin}</p>
          </section>
        </main>
      </div>
    );
  }

  const users = (await listUsers()).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    profileImageUrl: u.profileImageUrl,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));

  return (
    <div className="app-shell">
      <SiteHeader locale={locale} currentUser={currentUser} />
      <main className="container page-grid">
        <section className="panel">
          <h1>{messages.adminTitle}</h1>
          <AdminUsersPanel locale={locale} users={users} />
        </section>
      </main>
    </div>
  );
}
