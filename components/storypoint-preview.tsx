import Link from 'next/link';
import { getMessages } from '@/lib/i18n';
import { Locale, Storypoint } from '@/lib/types';
import { CloseIcon } from './confirm-dialog';

export function StorypointPreview({
  storypoint,
  title,
  locale,
  isFavorite,
  onToggleFavorite,
  onPlay,
  onClose,
  isFavoriting
  }: {
  storypoint: Storypoint;
  title: string;
  locale: Locale;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlay: () => void;
  onClose: () => void;
  isFavoriting?: boolean;
}) {
  const messages = getMessages(locale);
  const submitterHref = storypoint.submittedByUserId ? `/${locale}/users/${storypoint.submittedByUserId}` : null;

  return (
    <aside className="mini-popup" aria-label={`Storypoint ${storypoint.locationName}`}>
      <div className="mini-popup-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{storypoint.locationName}</p>
          {storypoint.submittedByUserName ? (
            <p className="submitter-meta">
              <span className="muted">{messages.requestOwner}</span>
              {storypoint.submittedByProfileImageUrl ? (
                <img src={storypoint.submittedByProfileImageUrl} alt={storypoint.submittedByUserName} />
              ) : null}
              {submitterHref ? (
                <Link href={submitterHref}>{storypoint.submittedByUserName}</Link>
              ) : (
                <span>{storypoint.submittedByUserName}</span>
              )}
            </p>
          ) : null}
        </div>
        <div className="popup-controls">
          <button className={`icon-button ${isFavorite ? 'favorite-active' : ''}`} type="button" onClick={onToggleFavorite} disabled={isFavoriting} aria-label={isFavorite ? messages.unfavoriteStorypoint : messages.favoriteStorypoint}>
            {isFavoriting ? <span className="spinner" /> : (isFavorite ? '♥' : '♡')}
          </button>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
      </div>
      <div className="story-actions" style={{ marginTop: 10 }}>
        <button className="primary-button" type="button" onClick={onPlay}>
          Play
        </button>
      </div>
    </aside>
  );
}