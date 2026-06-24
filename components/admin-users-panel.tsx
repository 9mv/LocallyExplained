'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Locale } from '@/lib/types';

type AdminSafeUser = {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
};

export function AdminUsersPanel({ locale, users }: { locale: Locale; users: AdminSafeUser[] }) {
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = `${u.name} ${u.email}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, users]);

  return (
    <div className="stack">
      <label className="field">
        <span>Search users</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or email"
        />
      </label>

      <div className="list">
        {filtered.length === 0 ? <p className="muted">No users found.</p> : null}
        {filtered.map((u) => (
          <article className="list-item" key={u.id}>
            <div className="admin-row">
              <strong>
                <Link href={`/${locale}/users/${u.id}`}>{u.name}</Link>
              </strong>
              <span className="muted submitter-meta">
                {u.profileImageUrl ? (
                  <img src={u.profileImageUrl} alt={u.name} />
                ) : (
                  <span>{u.name.charAt(0).toUpperCase()}</span>
                )}
                <span>{u.email}</span>
                <span className="muted">({u.role})</span>
              </span>
            </div>

            <div className="content-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={deletingId === u.id}
                onClick={async () => {
                  if (!window.confirm('Delete this account?')) return;
                  setDeletingId(u.id);
                  try {
                    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      window.alert(data.error || 'Delete failed');
                      return;
                    }
                    window.location.reload();
                  } finally {
                    setDeletingId(null);
                  }
                }}
              >
                Delete
                {deletingId === u.id ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
