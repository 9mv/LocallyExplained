'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getMessages } from '@/lib/i18n';
import { Locale, UserAccount } from '@/lib/types';
import { LanguageSwitcher } from './language-switcher';

const mobileBreakpoint = '(max-width: 760px)';

export function SiteHeader({ locale, currentUser }: { locale: Locale; currentUser: UserAccount | null }) {
  const messages = getMessages(locale);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
  };

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

          {isMobile && !menuOpen && !userMenuOpen ? (
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
            <LanguageSwitcher locale={locale} onNavigate={closeMenu} />
            {currentUser ? (
              <div className="user-menu-wrapper" ref={userMenuRef}>
                <button
                  className="user-button"
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  aria-label="User menu"
                >
                  {currentUser.profileImageUrl ? (
                    <img className="user-avatar" src={currentUser.profileImageUrl} alt={currentUser.name} />
                  ) : (
                    <div className="user-avatar placeholder">{currentUser.name.charAt(0).toUpperCase()}</div>
                  )}
                  <span>{currentUser.name}</span>
                </button>
                {userMenuOpen ? (
                  <div className="user-dropdown">
                    <Link className="ghost-button" href={`/${locale}/users/${currentUser.id}`} onClick={() => setUserMenuOpen(false)}>
                      {messages.profileTitle}
                    </Link>
                    <Link className="ghost-button" href={`/${locale}/account`} onClick={() => setUserMenuOpen(false)}>
                      {messages.accountSettings}
                    </Link>
                    {currentUser.role === 'admin' ? (
                      <Link className="ghost-button" href={`/${locale}/admin`} onClick={() => setUserMenuOpen(false)}>
                        {messages.adminTitle}
                      </Link>
                    ) : null}
                    <button className="ghost-button" type="button" onClick={handleLogout}>
                      {messages.signOut}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link className="ghost-button" href={`/${locale}/account`} onClick={closeMenu}>
                {messages.signIn}
              </Link>
            )}
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
              <LanguageSwitcher locale={locale} onNavigate={closeMenu} />
              {currentUser ? (
                <>
                  <Link className="ghost-button" href={`/${locale}/users/${currentUser.id}`} onClick={closeMenu}>
                    {messages.profileTitle}
                  </Link>
                  <Link className="ghost-button" href={`/${locale}/account`} onClick={closeMenu}>
                    {messages.accountSettings}
                  </Link>
                  {currentUser.role === 'admin' ? (
                    <Link className="ghost-button" href={`/${locale}/admin`} onClick={closeMenu}>
                      {messages.adminTitle}
                    </Link>
                  ) : null}
                  <button className="ghost-button" type="button" onClick={handleLogout}>
                    {messages.signOut}
                  </button>
                </>
              ) : (
                <Link className="ghost-button" href={`/${locale}/account`} onClick={closeMenu}>
                  {messages.signIn}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </header>
    </>
  );
}
