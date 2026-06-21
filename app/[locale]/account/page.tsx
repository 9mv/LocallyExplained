import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { AccountCenter } from '@/components/account-center';
import { isLocale } from '@/lib/i18n';
import { listUserFavorites, listUserRequests, listUserStorypoints } from '@/lib/store';
import { getCurrentUser } from '@/lib/session';

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const { locale } = await params;
  const { returnTo } = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const [requests, favorites, storypoints] = currentUser
    ? await Promise.all([listUserRequests(currentUser), listUserFavorites(currentUser), listUserStorypoints(currentUser)])
    : [[], [], []];

  return (
    <div className="app-shell">
      <SiteHeader locale={locale} currentUser={currentUser} />
      <main className="container page-grid">
        <AccountCenter
          locale={locale}
          currentUser={currentUser}
          requests={requests}
          favorites={favorites}
          storypoints={storypoints}
          returnTo={returnTo}
        />
      </main>
    </div>
  );
}
