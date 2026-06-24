'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Locale, Storypoint, UserAccount } from '@/lib/types';
import { getLocaleStorypoint, getMessages } from '@/lib/i18n';
import { CloseIcon } from './confirm-dialog';

export function StoryReader({
  locale,
  storypoint,
  currentUser,
  isFavorite,
  backHref,
  onClose
}: {
  locale: Locale;
  storypoint: Storypoint;
  currentUser: UserAccount | null;
  isFavorite: boolean;
  backHref: string;
  onClose?: () => void;
}) {
  const messages = getMessages(locale);
  const router = useRouter();
  const story = useMemo(() => getLocaleStorypoint(storypoint, locale), [locale, storypoint]);
  const [playing, setPlaying] = useState(false);
  const [fontSize, setFontSize] = useState(1);
  const [favorite, setFavorite] = useState(isFavorite);
  const [favoriting, setFavoriting] = useState(false);
  const speechLocale = locale === 'ca' ? 'ca-ES' : locale === 'es' ? 'es-ES' : 'en-US';

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--story-font-size', `${fontSize}rem`);
  }, [fontSize]);

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  const toggleFavorite = async () => {
    if (!currentUser) {
      window.location.assign(`/${locale}/account?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setFavoriting(true);
    const response = await fetch(`/api/favorites/${storypoint.id}`, { method: 'POST' });

    if (!response.ok) {
      setFavoriting(false);
      return;
    }

    const payload = (await response.json()) as { favoriteStorypointIds: string[] };
    setFavorite(payload.favoriteStorypointIds.includes(storypoint.id));
    setFavoriting(false);
  };

  const toggleSpeech = () => {
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${story.title}. ${story.body}`);
    utterance.lang = speechLocale;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  };

  return (
    <section className="reader" aria-label={story.title}>
      <div className="story-actions">
        <div>
          <h1>{story.title}</h1>
          {storypoint.submittedByUserName ? (
            <p className="submitter-meta">
              <span className="muted">{messages.requestOwner}</span>
              {storypoint.submittedByProfileImageUrl ? (
                <img src={storypoint.submittedByProfileImageUrl} alt={storypoint.submittedByUserName} />
              ) : null}
              {storypoint.submittedByUserId ? (
                <Link href={`/${locale}/users/${storypoint.submittedByUserId}`}>{storypoint.submittedByUserName}</Link>
              ) : (
                <span>{storypoint.submittedByUserName}</span>
              )}
            </p>
          ) : null}
        </div>
        <div className="popup-controls">
          <button className={`icon-button ${favorite ? 'favorite-active' : ''}`} type="button" onClick={() => void toggleFavorite()} disabled={favoriting} aria-label={favorite ? messages.unfavoriteStorypoint : messages.favoriteStorypoint}>
            {favoriting ? <span className="spinner" /> : (favorite ? '♥' : '♡')}
          </button>
          <button
            className="close-button"
            type="button"
            onClick={() => {
              onClose?.();
              router.push(backHref);
            }}
            aria-label={messages.close}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <div className="reader-toolbar" style={{ margin: '14px 0 18px' }}>
        <button className="pill" type="button" onClick={() => setFontSize((value) => Math.max(0.85, value - 0.1))}>
          {messages.smallerText}
        </button>
        <button className="pill" type="button" onClick={() => setFontSize((value) => Math.min(1.5, value + 0.1))}>
          {messages.largerText}
        </button>
        <button className="pill" type="button" onClick={toggleSpeech}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>
      <article className="reader-content">{story.body}</article>
    </section>
  );
}