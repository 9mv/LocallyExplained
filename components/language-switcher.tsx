'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Locale } from '@/lib/types';

const locales: Locale[] = ['ca', 'es', 'en'];

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const segments = pathname.split('/');

  return (
    <div className="language-switcher">
      {locales.map((nextLocale) => {
        const nextPath = ['/', nextLocale, ...segments.slice(2)].join('/').replace(/\/+/g, '/');

        return (
          <Link key={nextLocale} className={nextLocale === locale ? 'pill' : 'ghost-button'} href={nextPath}>
            {nextLocale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
