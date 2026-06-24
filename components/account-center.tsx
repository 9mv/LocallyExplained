'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
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
  const [registerStep, setRegisterStep] = useState<'form' | 'verify'>('form');
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
  const [recoveryAction, setRecoveryAction] = useState<'send-code' | 'reset-password' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<'request' | 'favorite' | 'storypoint' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyCountdown, setVerifyCountdown] = useState(0);
  const [resendCountdown, setResendCountdown] = useState(0);

  const clearNotice = () => {
    setMessage(null);
    setIsError(false);
  };

  const switchMode = (next: 'login' | 'register' | 'recover') => {
    clearNotice();
    if (next !== 'register') {
      setRegisterStep('form');
      setResumeToken(null);
      setVerificationCode('');
      setVerifyCountdown(0);
      setResendCountdown(0);
      setUsernameStatus('idle');
    }
    setMode(next);
  };

  // Real-time username availability check: fires 1s after the user stops typing.
  useEffect(() => {
    const value = username.trim();
    if (!value) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/register/username-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: value })
        });
        const data = await response.json();
        if (!cancelled) {
          setUsernameStatus(data.available ? 'available' : 'taken');
        }
      } catch {
        if (!cancelled) setUsernameStatus('idle');
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  // Countdown timers for the verification code expiry (5 min) and resend cooldown (2 min).
  useEffect(() => {
    if (verifyCountdown <= 0) return;
    const timer = setTimeout(() => setVerifyCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [verifyCountdown]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const profileRequests = useMemo(() => requests.filter((request) => request.status === 'pending'), [requests]);
  const profileStorypoints = useMemo(() => storypoints, [storypoints]);

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

  const loginFormRef = useRef<HTMLFormElement>(null);
  const registerFormRef = useRef<HTMLFormElement>(null);

  if (!currentUser) {
    return (
      <section className="panel auth-panel">
        <div className="stack">
          <div className="content-actions">
            <button className="pill" type="button" onClick={() => switchMode('login')}>
              {messages.signIn}
            </button>
            <button className="pill" type="button" onClick={() => switchMode('register')}>
              {messages.signUp}
            </button>
          </div>

          {mode === 'login' ? (
            <form
              ref={loginFormRef}
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
                    if (response.status === 403) {
                      const data = await response.json();
                      if (data.resumeToken) {
                        setResumeToken(data.resumeToken);
                        setVerificationCode('');
                        setVerifyCountdown(Math.ceil((data.ttl ?? 0) / 1000));
                        setResendCountdown(Math.ceil((data.resendCooldown ?? 0) / 1000));
                        setRegisterStep('verify');
                        setMode('register');
                        setMessage(messages.accountNotVerified);
                        setIsError(true);
                        return;
                      }
                    }
                    setMessage(messages.invalidCredentials);
                    setIsError(true);
                    return;
                  }

                  if (returnTo && returnTo !== `/${locale}/account`) {
                    router.replace(returnTo);
                    router.refresh();
                  } else {
                    router.refresh();
                  }
                } finally {
                  setSaving(false);
                }
              }}
            >
              <h2>{messages.signIn}</h2>
              <label className="field">
                <span>{messages.requestFormEmail}</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loginFormRef.current?.requestSubmit(); } }} />
              </label>
              <label className="field">
                <span>{messages.password}</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loginFormRef.current?.requestSubmit(); } }} />
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
                onClick={() => switchMode('recover')}
              >
                {messages.forgotPassword}
              </button>
            </form>
          ) : mode === 'register' ? (
            registerStep === 'form' ? (
              <form
                ref={registerFormRef}
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (saving) return;

                  if (!username.trim()) {
                    setMessage(messages.username);
                    setIsError(true);
                    return;
                  }
                  if (usernameStatus !== 'available') {
                    setMessage(messages.usernameTaken);
                    setIsError(true);
                    return;
                  }
                  if (password !== confirmPassword) {
                    setMessage(messages.confirmPassword);
                    setIsError(true);
                    return;
                  }

                  setSaving(true);
                  clearNotice();
                  try {
                    const response = await fetch('/api/register', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username, email, password, confirmPassword })
                    });

                    if (!response.ok) {
                      const data = await response.json();
                      // A 502 means the account was created but the verification email
                      // could not be sent. Advance to the verify step so the user can
                      // resend the code instead of being stuck (the email/username are
                      // now taken, so resubmitting the form is not an option).
                      if (response.status === 502 && data.resumeToken) {
                        setResumeToken(data.resumeToken);
                        setVerificationCode('');
                        setVerifyCountdown(Math.ceil((data.ttl ?? 0) / 1000));
                        setResendCountdown(2 * 60);
                        setRegisterStep('verify');
                      }
                      setMessage(data.error || messages.invalidCredentials);
                      setIsError(true);
                      return;
                    }

                    const data = await response.json();
                    setResumeToken(data.resumeToken);
                    setVerificationCode('');
                    setVerifyCountdown(Math.ceil((data.ttl ?? 0) / 1000));
                    setResendCountdown(2 * 60);
                    setRegisterStep('verify');
                    setMessage(messages.verificationEmailSent);
                    setIsError(false);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <h2>{messages.register}</h2>
                <label className="field">
                  <span>{messages.username}</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); registerFormRef.current?.requestSubmit(); } }}
                  />
                  {usernameStatus === 'checking' ? <span className="muted">{messages.usernameChecking}</span> : null}
                  {usernameStatus === 'available' ? <span className="muted">{messages.usernameAvailable}</span> : null}
                  {usernameStatus === 'taken' ? <span className="muted">{messages.usernameTaken}</span> : null}
                </label>
                <label className="field">
                  <span>{messages.requestFormEmail}</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); registerFormRef.current?.requestSubmit(); } }} />
                </label>
                <label className="field">
                  <span>{messages.password}</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); registerFormRef.current?.requestSubmit(); } }} />
                </label>
                <label className="field">
                  <span>{messages.confirmPassword}</span>
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); registerFormRef.current?.requestSubmit(); } }} />
                </label>
                {message ? <div className={`notice ${isError ? 'notice-error' : ''}`}>{message}</div> : null}
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving || usernameStatus === 'taken'}
                >
                  {messages.register}
                  {saving ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
                </button>
              </form>
            ) : (
              <form
                ref={registerFormRef}
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (saving || !resumeToken) return;

                  setSaving(true);
                  clearNotice();
                  try {
                    const response = await fetch('/api/register/verify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ resumeToken, code: verificationCode })
                    });

                    if (!response.ok) {
                      const data = await response.json();
                      if (data.error === 'expired' || data.error === 'too-many-attempts') {
                        setMessage(messages.verificationExpired);
                        setVerifyCountdown(0);
                      } else {
                        setMessage(messages.invalidVerificationCode);
                      }
                      setIsError(true);
                      return;
                    }

                    // Account verified + auto-login (session cookie set by the server).
                    if (returnTo && returnTo !== `/${locale}/account`) {
                      router.replace(returnTo);
                      router.refresh();
                    } else {
                      router.refresh();
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <h2>{messages.verifyAccount}</h2>
                {message ? <div className={`notice ${isError ? 'notice-error' : ''}`}>{message}</div> : null}
                <label className="field">
                  <span>{messages.verificationCode}</span>
                  <input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    placeholder="123456"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); registerFormRef.current?.requestSubmit(); } }}
                  />
                </label>
                {verifyCountdown > 0 ? (
                  <span className="muted">{Math.floor(verifyCountdown / 60)}:{String(verifyCountdown % 60).padStart(2, '0')}</span>
                ) : (
                  <span className="muted">{messages.verificationExpired}</span>
                )}
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving || verifyCountdown <= 0}
                >
                  {messages.verifyAccount}
                  {saving ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={resendCountdown > 0 || saving}
                  onClick={async () => {
                    if (!resumeToken) return;
                    clearNotice();
                    try {
                      const response = await fetch('/api/register/resend', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ resumeToken })
                      });
                      if (response.status === 429) {
                        const data = await response.json();
                        setResendCountdown(Math.ceil((data.retryAfter ?? 0) / 1000));
                        if (typeof data.ttl === 'number') {
                          setVerifyCountdown(Math.ceil(data.ttl / 1000));
                        }
                        setMessage(messages.codeResentSoon);
                        setIsError(true);
                        return;
                      }
                      if (!response.ok) {
                        const data = await response.json();
                        setMessage(data.error || messages.verificationExpired);
                        setIsError(true);
                        return;
                      }
                      const data = await response.json();
                      setVerifyCountdown(Math.ceil((data.ttl ?? 5 * 60 * 1000) / 1000));
                      setResendCountdown(2 * 60);
                      setMessage(messages.verificationEmailSent);
                      setIsError(false);
                    } catch {
                      setMessage(messages.verificationExpired);
                      setIsError(true);
                    }
                  }}
                >
                  {messages.resendCode}
                  {resendCountdown > 0 ? ` (${Math.floor(resendCountdown / 60)}:${String(resendCountdown % 60).padStart(2, '0')})` : null}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setRegisterStep('form');
                    setResumeToken(null);
                    setVerificationCode('');
                    setVerifyCountdown(0);
                    setResendCountdown(0);
                    clearNotice();
                  }}
                >
                  {messages.backToForm}
                </button>
              </form>
            )
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
                disabled={recoveryAction !== null}
                onClick={async () => {
                  if (recoveryAction) return;

                  setRecoveryAction('reset-password');
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
                    setRecoveryAction(null);
                  }
                }}
              >
                {messages.resetPassword}
                {recoveryAction === 'reset-password' ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={recoveryAction !== null}
                onClick={async () => {
                  if (recoveryAction) return;

                  setRecoveryAction('send-code');
                  setMessage(null);
                  setIsError(false);
                  try {
                    const response = await fetch('/api/recover', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    });
                    if (!response.ok) {
                      const data = await response.json();
                      setMessage(data.error || messages.invalidRecoveryCode);
                      setIsError(true);
                      return;
                    }
                    setMessage(messages.recoveryEmailSent);
                  } finally {
                    setRecoveryAction(null);
                  }
                }}
              >
                {messages.sendRecoveryCode}
                {recoveryAction === 'send-code' ? <span className="spinner" style={{ marginLeft: 8 }} /> : null}
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
