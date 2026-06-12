'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Locale } from '@/lib/types';
import { getMessages } from '@/lib/i18n';

export function AdminLogin({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="auth-form">
      <h2>{messages.adminLogin}</h2>
      <div className="stack">
        <label className="field">
          <span>{messages.password}</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <div className="notice">{error}</div> : null}
        <button
          className="primary-button"
          type="button"
          onClick={async () => {
            const response = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password })
            });

            if (!response.ok) {
              setError('Invalid password');
              return;
            }

            router.refresh();
          }}
        >
          {messages.login}
        </button>
      </div>
    </div>
  );
}
