import { Storypoint } from '@/lib/types';

export function StorypointPreview({
  storypoint,
  title,
  onPlay,
  onClose
}: {
  storypoint: Storypoint;
  title: string;
  onPlay: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="mini-popup" aria-label={`Storypoint ${storypoint.locationName}`}>
      <div className="mini-popup-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{storypoint.locationName}</p>
        </div>
        <button className="close-button" type="button" onClick={onClose} aria-label="Close">
          X
        </button>
      </div>
      <div className="story-actions" style={{ marginTop: 10 }}>
        <button className="primary-button" type="button" onClick={onPlay}>
          Play
        </button>
      </div>
    </aside>
  );
}
