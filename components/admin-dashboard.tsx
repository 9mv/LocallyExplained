'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Locale, Storypoint, StorypointRequest } from '@/lib/types';
import { getMessages } from '@/lib/i18n';

export function AdminDashboard({ locale, requests, storypoints }: { locale: Locale; requests: StorypointRequest[]; storypoints: Storypoint[] }) {
  const messages = getMessages(locale);
  const pendingRequests = requests.filter((request) => request.status === 'pending');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="stack">
      <h2>{messages.pendingRequests}</h2>
      <div className="list">
        {pendingRequests.length === 0 ? <p className="muted">No pending requests.</p> : null}
        {pendingRequests.map((request) => (
          <article className="list-item" key={request.id}>
            <div className="admin-row">
              <strong>{request.title}</strong>
              <span className="muted submitter-meta">
                {request.submittedByProfileImageUrl ? (
                  <img src={request.submittedByProfileImageUrl} alt={request.submittedByUserName ?? request.email} />
                ) : null}
                {request.submittedByUserId ? <Link href={`/${locale}/users/${request.submittedByUserId}`}>{request.submittedByUserName ?? request.email}</Link> : request.submittedByUserName ?? request.email}
              </span>
            </div>
            <p>{request.body}</p>
            <p className="muted">{request.lat.toFixed(5)}, {request.lng.toFixed(5)}</p>
            <RequestActions request={request} messages={messages} />
          </article>
        ))}
      </div>

      <h2>{messages.adminStorypoints}</h2>
      <div className="list">
        {storypoints.map((storypoint) => (
          <article className="list-item" key={storypoint.id}>
            <div className="admin-row">
              <strong>
                <Link href={`/${locale}/storypoints/${storypoint.id}`}>{storypoint.locationName}</Link>
              </strong>
              <span className="muted submitter-meta">
                {storypoint.submittedByProfileImageUrl ? (
                  <img src={storypoint.submittedByProfileImageUrl} alt={storypoint.submittedByUserName ?? storypoint.submittedByEmail ?? ''} />
                ) : null}
                {storypoint.submittedByUserId ? (
                  <Link href={`/${locale}/users/${storypoint.submittedByUserId}`}>{storypoint.submittedByUserName ?? storypoint.submittedByEmail ?? 'Admin'}</Link>
                ) : (
                  storypoint.submittedByUserName ?? storypoint.submittedByEmail ?? 'Admin'
                )}
              </span>
            </div>
            <div className="content-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={deletingId === storypoint.id}
                onClick={async () => {
                  if (!window.confirm(messages.deleteStorypoint)) {
                    return;
                  }

                  setDeletingId(storypoint.id);
                  await fetch(`/api/admin/storypoints/${storypoint.id}`, { method: 'DELETE' });
                  window.location.reload();
                }}
              >
                {deletingId === storypoint.id ? <span className="spinner" style={{ marginRight: 8 }} /> : null}
                {messages.delete}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RequestActions({ request, messages }: { request: StorypointRequest; messages: any }) {
  const [sendingDecision, setSendingDecision] = useState<'approved' | 'rejected' | null>(null);

  return (
    <div className="content-actions">
      <button
        className="primary-button"
        type="button"
        disabled={sendingDecision !== null}
        onClick={async () => {
          if (sendingDecision) return;

          setSendingDecision('approved');
          try {
            await fetch(`/api/admin/storypoint-requests/${request.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decision: 'approved' })
            });
            window.location.reload();
          } finally {
            setSendingDecision(null);
          }
        }}
      >
        {messages.approve}
        {sendingDecision === 'approved' ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
      </button>
      <button
        className="ghost-button"
        type="button"
        disabled={sendingDecision !== null}
        onClick={async () => {
          if (sendingDecision) return;

          setSendingDecision('rejected');
          try {
            await fetch(`/api/admin/storypoint-requests/${request.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decision: 'rejected' })
            });
            window.location.reload();
          } finally {
            setSendingDecision(null);
          }
        }}
      >
        {messages.reject}
        {sendingDecision === 'rejected' ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
      </button>
    </div>
  );
}
