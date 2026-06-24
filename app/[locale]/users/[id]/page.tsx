import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { getMessages, isLocale } from '@/lib/i18n';
import { getUserById, listUserStorypoints } from '@/lib/store';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function UserProfilePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  const messages = getMessages(locale);
  const storypoints = await listUserStorypoints(user);

  return (
    <div className="app-shell">
      <SiteHeader locale={locale} currentUser={currentUser} />
      <main className="container page-grid">
        <section className="panel">
          <h1>{messages.profileTitle}</h1>
          <p>{messages.profileSubtitle}</p>
          <div className="profile-header">
            {user.profileImageUrl ? <img className="profile-image" src={user.profileImageUrl} alt={user.name} /> : <div className="profile-image placeholder">{user.name.charAt(0).toUpperCase()}</div>}
            <div>
              <strong>{user.name}</strong>
              <p className="muted">{user.email}</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>{messages.profileStorypoints}</h2>
          <div className="list">
            {storypoints.length === 0 ? <p className="muted">{messages.noStorypoints}</p> : null}
            {storypoints.map((storypoint) => (
              <div className="list-item" key={storypoint.id}>
                <strong>
                  <Link href={`/${locale}/storypoints/${storypoint.id}`}>{storypoint.locationName}</Link>
                </strong>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
