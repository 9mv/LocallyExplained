import Link from 'next/link';
import { getMessages } from '@/lib/i18n';
import { Locale } from '@/lib/types';
import { LanguageSwitcher } from './language-switcher';

export function SiteHeader({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <div className="brand">
          <strong>{messages.appName}</strong>
          <span>{messages.subtitle}</span>
        </div>

        <nav className="nav-links" aria-label="Primary">
          <Link className="ghost-button" href={`/${locale}`}>
            {messages.mapTitle}
          </Link>
          <Link className="ghost-button" href={`/${locale}/donations`}>
            {messages.donationsTitle}
          </Link>
          <Link className="ghost-button" href={`/${locale}/who-are-we`}>
            {messages.whoWeAreTitle}
          </Link>
          <LanguageSwitcher locale={locale} />
          <Link className="admin-button" href={`/${locale}/admin`}>
            {messages.adminLogin}
          </Link>
        </nav>
      </div>
    </header>
  );
}
