'use client';

import { Locale, StorypointRequest } from '@/lib/types';
import { getMessages } from '@/lib/i18n';

export function AdminDashboard({ locale, requests }: { locale: Locale; requests: StorypointRequest[] }) {
  const messages = getMessages(locale);
  const pendingRequests = requests.filter((request) => request.status === 'pending');

  return (
    <div className="stack">
      <h2>{messages.pendingRequests}</h2>
      <div className="list">
        {pendingRequests.length === 0 ? <p className="muted">No pending requests.</p> : null}
        {pendingRequests.map((request) => (
          <article className="list-item" key={request.id}>
            <div className="admin-row">
              <strong>{request.title}</strong>
              <span className="muted">{request.email}</span>
            </div>
            <p>{request.body}</p>
            <p className="muted">{request.lat.toFixed(5)}, {request.lng.toFixed(5)}</p>
            <div className="content-actions">
              <button
                className="primary-button"
                type="button"
                onClick={async () => {
                  await fetch(`/api/admin/storypoint-requests/${request.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ decision: 'approved' })
                  });
                  window.location.reload();
                }}
              >
                {messages.approve}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={async () => {
                  await fetch(`/api/admin/storypoint-requests/${request.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ decision: 'rejected' })
                  });
                  window.location.reload();
                }}
              >
                {messages.reject}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
