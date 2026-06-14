'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMessages } from '@/lib/i18n';
import { Locale, UserAccount } from '@/lib/types';
import { LanguageSwitcher } from './language-switcher';

const mobileBreakpoint = '(max-width: 760px)';

export function SiteHeader({ locale, currentUser }: { locale: Locale; currentUser: UserAccount | null }) {
  const messages = getMessages(locale);
  const [isMobile, setIsMobile] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileBreakpoint);
    const updateMedia = () => setIsMobile(mediaQuery.matches);

    updateMedia();
    mediaQuery.addEventListener('change', updateMedia);

    return () => mediaQuery.removeEventListener('change', updateMedia);
  }, []);

  useEffect(() => {
    const updateScrollState = () => {
      setIsAtTop(window.scrollY < 24);
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });

    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {isMobile && !isAtTop && !menuOpen ? (
        <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          ☰
        </button>
      ) : null}
      <header className={`topbar ${isMobile && !isAtTop && !menuOpen ? 'topbar-hidden' : ''}`}>
      <div className="container topbar-inner">
        <Link className="brand" href={`/${locale}`}>
          <strong>{messages.appName}</strong>
          <span>{messages.subtitle}</span>
        </Link>

        {isMobile && !menuOpen ? (
          <button className="topbar-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            ☰
          </button>
        ) : null}

        {isMobile && menuOpen ? (
          <button className="topbar-close-button" type="button" onClick={closeMenu} aria-label="Close menu">
            X
          </button>
        ) : null}

        <nav className="nav-links" aria-label="Primary">
          <Link className="ghost-button" href={`/${locale}`} onClick={closeMenu}>
            {messages.mapTitle}
          </Link>
          <Link className="ghost-button" href={`/${locale}/donations`} onClick={closeMenu}>
            {messages.donationsTitle}
          </Link>
          <Link className="ghost-button" href={`/${locale}/who-are-we`} onClick={closeMenu}>
            {messages.whoWeAreTitle}
          </Link>
          <Link className="ghost-button" href={`/${locale}/account`} onClick={closeMenu}>
            {currentUser ? currentUser.name : messages.accountTitle}
          </Link>
          <LanguageSwitcher locale={locale} onNavigate={closeMenu} />
          <Link className="admin-button" href={`/${locale}/admin`} onClick={closeMenu}>
            {messages.adminLogin}
          </Link>
        </nav>

        {isMobile && menuOpen ? (
          <div className="mobile-nav-list">
            <Link className="ghost-button" href={`/${locale}`} onClick={closeMenu}>
              {messages.mapTitle}
            </Link>
            <Link className="ghost-button" href={`/${locale}/donations`} onClick={closeMenu}>
              {messages.donationsTitle}
            </Link>
            <Link className="ghost-button" href={`/${locale}/who-are-we`} onClick={closeMenu}>
              {messages.whoWeAreTitle}
            </Link>
            <Link className="ghost-button" href={`/${locale}/account`} onClick={closeMenu}>
              {currentUser ? currentUser.name : messages.accountTitle}
            </Link>
            <LanguageSwitcher locale={locale} onNavigate={closeMenu} />
            <Link className="admin-button" href={`/${locale}/admin`} onClick={closeMenu}>
              {messages.adminLogin}
            </Link>
          </div>
        ) : null}
      </div>
    </header>
    </>
  );
}
