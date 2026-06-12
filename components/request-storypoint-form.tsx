'use client';

import { useState } from 'react';
import { Locale } from '@/lib/types';
import { getMessages } from '@/lib/i18n';

export function RequestStorypointForm({
  locale,
  lat,
  lng,
  onSubmit,
  onCancel
}: {
  locale: Locale;
  lat: number;
  lng: number;
  onSubmit: (input: { title: string; body: string; email: string; locale: Locale; lat: number; lng: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const messages = getMessages(locale);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <aside className="request-form" aria-label={messages.requestStorypoint}>
      <h2>{messages.requestStorypoint}</h2>
      <p className="muted">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
      <div className="stack">
        <label className="field">
          <span>{messages.requestFormTitle}</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span>{messages.requestFormStory}</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <label className="field">
          <span>{messages.requestFormEmail}</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <div className="request-toolbar">
          <button
            className="primary-button"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit({ title, body, email, locale, lat, lng });
              } finally {
                setSaving(false);
              }
            }}
          >
            {messages.submitRequest}
          </button>
          <button className="ghost-button" type="button" onClick={onCancel}>
            {messages.cancelRequest}
          </button>
        </div>
      </div>
    </aside>
  );
}
