'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Locale, Storypoint } from '@/lib/types';
import { getLocaleStorypoint, getMessages } from '@/lib/i18n';

export function StoryReader({
  locale,
  storypoint,
  backHref,
  onClose
}: {
  locale: Locale;
  storypoint: Storypoint;
  backHref: string;
  onClose?: () => void;
}) {
  const messages = getMessages(locale);
  const router = useRouter();
  const story = useMemo(() => getLocaleStorypoint(storypoint, locale), [locale, storypoint]);
  const [playing, setPlaying] = useState(false);
  const [fontSize, setFontSize] = useState(1);
  const speechLocale = locale === 'ca' ? 'ca-ES' : locale === 'es' ? 'es-ES' : 'en-US';

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--story-font-size', `${fontSize}rem`);
  }, [fontSize]);

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
        <h1>{story.title}</h1>
        <button
          className="close-button"
          type="button"
          onClick={() => {
            onClose?.();
            router.push(backHref);
          }}
          aria-label={messages.close}
        >
          X
        </button>
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
