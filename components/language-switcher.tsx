'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Locale } from '@/lib/types';

const locales: Locale[] = ['ca', 'es', 'en'];

const localeNames: Record<Locale, string> = {
  ca: 'Català',
  es: 'Español',
  en: 'English'
};

export function LanguageSwitcher({ locale, onNavigate }: { locale: Locale; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const segments = pathname.split('/');

  return (
    <div className="language-switcher" ref={menuRef}>
      <button className="language-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {localeNames[locale]}
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div className="language-menu" role="menu">
          {locales.map((nextLocale) => {
            const nextPath = ['/', nextLocale, ...segments.slice(2)].join('/').replace(/\/+/g, '/');
            const isActive = nextLocale === locale;

            return (
              <Link
                key={nextLocale}
                className={isActive ? 'language-menu-option active' : 'language-menu-option'}
                href={nextPath}
                role="menuitem"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                {localeNames[nextLocale]}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
