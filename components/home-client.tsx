'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getLocaleStorypoint, getMessages } from '@/lib/i18n';
import { Locale, Storypoint, UserAccount } from '@/lib/types';
import { MapView } from './map-view';
import { RequestStorypointForm } from './request-storypoint-form';
import { StorypointPreview } from './storypoint-preview';

const defaultMapCenter = { lat: 20, lng: 0 };

export function HomeClient({ locale, storypoints, currentUser }: { locale: Locale; storypoints: Storypoint[]; currentUser: UserAccount | null }) {
  const messages = getMessages(locale);
  const [selectedStorypointId, setSelectedStorypointId] = useState<string | null>(null);
  const [requestMode, setRequestMode] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [favoriteStorypointIds, setFavoriteStorypointIds] = useState<string[]>(currentUser?.favoriteStorypointIds ?? []);
  const [locating, setLocating] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  const selectedStorypoint = useMemo(
    () => storypoints.find((storypoint) => storypoint.id === selectedStorypointId) ?? null,
    [selectedStorypointId, storypoints]
  );

  const favoriteStorypointSet = useMemo(() => new Set(favoriteStorypointIds), [favoriteStorypointIds]);

  useEffect(() => {
    const stored = window.localStorage.getItem('locally-explained-location');

    if (stored) {
      setUserLocation(JSON.parse(stored) as { lat: number; lng: number });
    }
  }, []);

  useEffect(() => {
    setFavoriteStorypointIds(currentUser?.favoriteStorypointIds ?? []);
  }, [currentUser]);

  const handleUseLocation = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError(messages.locationDenied);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        window.localStorage.setItem('locally-explained-location', JSON.stringify(nextLocation));
        setUserLocation(nextLocation);
        setLocating(false);
      },
      () => {
        setLocationError(messages.locationDenied);
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 8_000 }
    );
  };

  const clearRequest = () => {
    setRequestMode(false);
    setPickedPoint(null);
  };

  const handleRequestSubmit = async (input: {
    title: string;
    body: string;
    email: string;
    locale: Locale;
    lat: number;
    lng: number;
  }) => {
    const response = await fetch('/api/storypoint-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error('Request submission failed');
    }

    setRequestStatus(currentUser ? messages.requestSubmitted : messages.requestFollowUp);
    clearRequest();
  };

  const toggleFavorite = async (storypointId: string) => {
    if (!currentUser) {
      window.location.assign(`/${locale}/account?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setFavoriting(true);
    const response = await fetch(`/api/favorites/${storypointId}`, { method: 'POST' });

    if (!response.ok) {
      setRequestStatus(messages.signInRequired);
      setFavoriting(false);
      return;
    }

    const payload = (await response.json()) as { favoriteStorypointIds: string[] };
    setFavoriteStorypointIds(payload.favoriteStorypointIds);
    setFavoriting(false);
  };

  return (
    <main className="container page-grid">
      <section className="hero-copy card">
        <h1>{messages.mapTitle}</h1>
        <p>{messages.mapCopy}</p>
        {/* currentUser ? <div className="notice">{currentUser.name}</div> : null */}
        <div className="content-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              if (requestMode) {
                clearRequest();
                return;
              }

              setRequestMode(true);
            }}
          >
            {requestMode ? messages.cancelRequest : messages.requestStorypoint}
          </button>
          {/* <Link className="ghost-button" href={`/${locale}/account${requestStatus ? `?returnTo=${encodeURIComponent(`/${locale}`)}` : ''}`}>
            {currentUser ? messages.accountTitle : messages.signIn}
          </Link> */}
          <Link className="ghost-button" href={`/${locale}/donations`}>
            {messages.donationsTitle}
          </Link>
        </div>
        {requestStatus ? <div className="notice" style={{ marginTop: 14 }}>{requestStatus}</div> : null}
        {!currentUser && requestStatus ? (
          <div className="content-actions" style={{ marginTop: 12 }}>
            <Link className="primary-button" href={`/${locale}/account?returnTo=${encodeURIComponent(`/${locale}`)}`}>
              {messages.signIn}
            </Link>
          </div>
        ) : null}
      </section>

      <section className="map-card">
        <MapView
          storypoints={storypoints}
          selectedStorypointId={selectedStorypointId}
          onSelectStorypoint={setSelectedStorypointId}
          requestMode={requestMode}
          onMapPick={(point) => setPickedPoint(point)}
          userLocation={userLocation ?? defaultMapCenter}
          pendingPoint={pickedPoint}
        />
        {!requestMode && (
          <button className="map-location-button" type="button" onClick={handleUseLocation} disabled={locating}>
            {locating ? <span className="spinner" style={{ marginRight: 8 }} /> : null}
            {messages.useLocation}
          </button>
        )}
        {!requestMode && locationError ? <div className="map-location-error">{locationError}</div> : null}
        {!requestMode && selectedStorypoint ? (
          <StorypointPreview
            storypoint={selectedStorypoint}
            title={getLocaleStorypoint(selectedStorypoint, locale).title}
            locale={locale}
            isFavorite={favoriteStorypointSet.has(selectedStorypoint.id)}
            isFavoriting={favoriting}
            onToggleFavorite={() => { if (!favoriting) void toggleFavorite(selectedStorypoint.id); }}
            onPlay={() => window.location.assign(`/${locale}/storypoints/${selectedStorypoint.id}`)}
            onClose={() => setSelectedStorypointId(null)}
          />
        ) : null}
        {requestMode && pickedPoint ? (
          <RequestStorypointForm
            locale={locale}
            lat={pickedPoint.lat}
            lng={pickedPoint.lng}
            currentUser={currentUser}
            onSubmit={handleRequestSubmit}
            onCancel={clearRequest}
          />
        ) : null}
      </section>
    </main>
  );
}
