'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMessages } from '@/lib/i18n';
import { Locale, Storypoint, StorypointRequest, UserAccount } from '@/lib/types';
import { ConfirmDialog, CloseIcon } from './confirm-dialog';

type Props = {
  locale: Locale;
  currentUser: UserAccount | null;
  requests: StorypointRequest[];
  favorites: Storypoint[];
  storypoints: Storypoint[];
  returnTo?: string;
};

export function AccountCenter({ locale, currentUser, requests, favorites, storypoints, returnTo }: Props) {
  const messages = getMessages(locale);
  const router = useRouter();
  const getDeleteKey = (target: 'request' | 'favorite' | 'storypoint', id: string) => `${target}:${id}`;
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>(currentUser ? 'login' : 'login');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [name, setName] = useState(currentUser?.name ?? '');
  const [profileImageUrl, setProfileImageUrl] = useState(currentUser?.profileImageUrl ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<'request' | 'favorite' | 'storypoint' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const profileRequests = useMemo(() => requests.filter((request) => request.status === 'pending'), [requests]);
  const profileStorypoints = useMemo(() => storypoints, [storypoints]);

  const redirectAfterAuth = () => {
    if (returnTo && returnTo !== `/${locale}/account`) {
      router.push(returnTo);
      return true;
    }

    return false;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId || !deleteTarget) return;

    const deletingKey = getDeleteKey(deleteTarget, deleteId);
    setDeleting(deletingKey);
    setDeleteTarget(null);

    try {
      const response = await fetch(
        `/api/account/${deleteTarget === 'request' ? 'requests' : deleteTarget === 'favorite' ? 'favorites' : 'storypoints'}/${deleteId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setDeleting(null);
      setDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteId(null);
  };

  const isDeletingItem = (target: 'request' | 'favorite' | 'storypoint', id: string) => deleting === getDeleteKey(target, id);

  if (!currentUser) {
    return (
      <section className="panel auth-panel">
        <div className="stack">
          <div className="content-actions">
            <button className="pill" type="button" onClick={() => setMode('login')}>
              {messages.signIn}
            </button>
            <button className="pill" type="button" onClick={() => setMode('register')}>
              {messages.signUp}
            </button>
          </div>

          {mode === 'login' ? (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                if (saving) return;

                setSaving(true);
                setMessage(null);
                setIsError(false);
                try {
                  const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                  });

                  if (!response.ok) {
                    setMessage(messages.invalidCredentials);
                    setIsError(true);
                    return;
                  }

                  router.refresh();
                  redirectAfterAuth();
                } finally {
                  setSaving(false);
                }
              }}
            >
              <h2>{messages.signIn}</h2>
              <label className="field">
                <span>{messages.requestFormEmail}</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="field">
                <span>{messages.password}</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              {message ? <div className={`notice ${isError ? 'notice-error' : ''}`}>{message}</div> : null}
              <button
                className="primary-button"
                type="submit"
                disabled={saving}
              >
                {messages.signIn}
                {saving ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setMode('recover');
                  setMessage(null);
                  setIsError(false);
                }}
              >
                {messages.forgotPassword}
              </button>
            </form>
          ) : mode === 'register' ? (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                if (saving) return;

                if (password !== confirmPassword) {
                  setMessage(messages.confirmPassword);
                  setIsError(true);
                  return;
                }

                setSaving(true);
                setMessage(null);
                setIsError(false);
                try {
                  const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, confirmPassword })
                  });

                  if (!response.ok) {
                    setMessage(response.status === 409 ? messages.emailAlreadyInUse : messages.invalidCredentials);
                    setIsError(true);
                    return;
                  }

                  router.refresh();
                  redirectAfterAuth();
                } finally {
                  setSaving(false);
                }
              }}
            >
              <h2>{messages.register}</h2>
              <label className="field">
                <span>{messages.requestFormEmail}</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="field">
                <span>{messages.password}</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <label className="field">
                <span>{messages.confirmPassword}</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
              {message ? <div className={`notice ${isError ? 'notice-error' : ''}`}>{message}</div> : null}
              <button
                className="primary-button"
                type="submit"
                disabled={saving}
              >
                {messages.register}
                {saving ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
              </button>
            </form>
          ) : (
            <div className="stack">
              <h2>{messages.recoverPassword}</h2>
              <label className="field">
                <span>{messages.requestFormEmail}</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="field">
                <span>{messages.recoveryCode}</span>
                <input type="text" value={resetCode} onChange={(event) => setResetCode(event.target.value)} placeholder="123456" />
              </label>
              <label className="field">
                <span>{messages.newPassword}</span>
                <input type="password" value={newPasswordForReset} onChange={(event) => setNewPasswordForReset(event.target.value)} />
              </label>
              <label className="field">
                <span>{messages.confirmPassword}</span>
                <input type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} />
              </label>
              {message ? <div className={`notice ${isError ? 'notice-error' : ''}`}>{message}</div> : null}
              <button
                className="primary-button"
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setMessage(null);
                  setIsError(false);
                  try {
                    const response = await fetch('/api/recover', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email, code: resetCode, newPassword: newPasswordForReset, confirmPassword: confirmNewPassword })
                    });

                    if (!response.ok) {
                      const data = await response.json();
                      setMessage(data.error || messages.invalidRecoveryCode);
                      setIsError(true);
                      return;
                    }

                    setMessage(messages.passwordResetSuccess);
                    setResetCode('');
                    setNewPasswordForReset('');
                    setConfirmNewPassword('');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {messages.resetPassword}
                {saving ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={async () => {
                  if (saving) return;
                  setSaving(true);
                  setMessage(null);
                  setIsError(false);
                  try {
                    await fetch('/api/recover', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    });
                    setMessage(messages.recoveryEmailSent);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {messages.sendRecoveryCode}
                {saving ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="layout-two-col">
      <section className="panel">
        <div className="panel-row">
          <div className="submitter-header">
            {currentUser.profileImageUrl ? (
              <img className="profile-image-small" src={currentUser.profileImageUrl} alt={currentUser.name} />
            ) : (
              <div className="profile-image-small placeholder">{currentUser.name.charAt(0).toUpperCase()}</div>
            )}
            <div>
              <h1>{messages.accountTitle}</h1>
              <p>{currentUser.email}</p>
            </div>
          </div>
              <button
                className="ghost-button"
                type="button"
                onClick={async () => {
                  if (loggingOut) return;

                  setLoggingOut(true);

                  try {
                    await fetch('/api/logout', { method: 'POST' });
                    router.refresh();
                  } finally {
                    setLoggingOut(false);
                  }
                }}
                disabled={loggingOut}
              >
              {loggingOut ? <span className="spinner" style={{ marginRight: 8 }} /> : null}
              {messages.signOut}
            </button>
        </div>

        <div className="stack">
          <h2>{messages.accountSettings}</h2>
          {currentUser.profileImageUrl ? (
            <img className="profile-image-preview" src={currentUser.profileImageUrl} alt={currentUser.name} />
          ) : null}
          <label className="field">
            <span>{messages.profileImage}</span>
            <input value={profileImageUrl} onChange={(event) => setProfileImageUrl(event.target.value)} placeholder="https://example.com/avatar.png" />
          </label>
          <label className="field">
            <span>{messages.name}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>{messages.requestFormEmail}</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>{messages.currentPassword}</span>
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label className="field">
            <span>{messages.newPassword}</span>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          {message ? <div className={`notice ${isError ? 'notice-error' : ''}`}>{message}</div> : null}
          <button
            className="primary-button"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setMessage(null);
              setIsError(false);

              try {
                const response = await fetch('/api/account', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email,
                    name,
                    profileImageUrl,
                    currentPassword,
                    newPassword
                  })
                });

                if (!response.ok) {
                  setMessage(response.status === 401 ? messages.signInRequired : messages.invalidCredentials);
                  setIsError(true);
                  return;
                }

                router.refresh();
              } finally {
                setSaving(false);
              }
            }}
          >
            {messages.saveAccount}
            {saving ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
          </button>
        </div>
      </section>

      <section className="stack">
        <article className="panel">
          <h2>{messages.myRequests}</h2>
          <div className="list">
            {profileRequests.length === 0 ? <p className="muted">{messages.noPendingRequests}</p> : null}
            {profileRequests.map((request) => (
              <div className="list-item" key={request.id}>
                <div className="mini-popup-header">
                  <strong>{request.title}</strong>
                  <button
                    className="ghost-button icon-button delete-button"
                    type="button"
                    aria-label={messages.deleteRequest}
                    disabled={isDeletingItem('request', request.id)}
                    onClick={() => {
                      setDeleteTarget('request');
                      setDeleteId(request.id);
                    }}
                  >
                    {isDeletingItem('request', request.id) ? <span className="spinner" /> : <CloseIcon />}
                  </button>
                </div>
                <p>{request.body}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>{messages.favorites}</h2>
          <div className="list">
            {favorites.length === 0 ? <p className="muted">{messages.noFavorites}</p> : null}
            {favorites.map((storypoint) => (
              <div className="list-item" key={storypoint.id}>
                <div className="mini-popup-header">
                  <strong>
                    <Link href={`/${locale}/storypoints/${storypoint.id}`}>{storypoint.locationName}</Link>
                  </strong>
                  <button
                    className="ghost-button icon-button delete-button"
                    type="button"
                    aria-label={messages.deleteFavorite}
                    disabled={isDeletingItem('favorite', storypoint.id)}
                    onClick={() => {
                      setDeleteTarget('favorite');
                      setDeleteId(storypoint.id);
                    }}
                  >
                    {isDeletingItem('favorite', storypoint.id) ? <span className="spinner" /> : <CloseIcon />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>{messages.myStorypoints}</h2>
          <div className="list">
            {profileStorypoints.length === 0 ? <p className="muted">{messages.noStorypoints}</p> : null}
            {profileStorypoints.map((storypoint) => (
              <div className="list-item" key={storypoint.id}>
                <div className="mini-popup-header">
                  <strong>
                    <Link href={`/${locale}/storypoints/${storypoint.id}`}>{storypoint.locationName}</Link>
                  </strong>
                  <button
                    className="ghost-button icon-button delete-button"
                    type="button"
                    aria-label={messages.deleteStorypointItem}
                    disabled={isDeletingItem('storypoint', storypoint.id)}
                    onClick={() => {
                      setDeleteTarget('storypoint');
                      setDeleteId(storypoint.id);
                    }}
                  >
                    {isDeletingItem('storypoint', storypoint.id) ? <span className="spinner" /> : <CloseIcon />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title={messages.delete}
        message={messages.deleteConfirm}
        confirmLabel={messages.delete}
        cancelLabel={messages.close}
        confirmDisabled={!!deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
