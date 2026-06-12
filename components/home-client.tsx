'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getLocaleStorypoint, getMessages } from '@/lib/i18n';
import { Locale, Storypoint } from '@/lib/types';
import { MapView } from './map-view';
import { RequestStorypointForm } from './request-storypoint-form';
import { StorypointPreview } from './storypoint-preview';

const defaultCenter = { lat: 39.9496, lng: 4.228 };

export function HomeClient({ locale, storypoints }: { locale: Locale; storypoints: Storypoint[] }) {
  const messages = getMessages(locale);
  const [selectedStorypointId, setSelectedStorypointId] = useState<string | null>(storypoints[0]?.id ?? null);
  const [requestMode, setRequestMode] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPrompt, setLocationPrompt] = useState(true);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const selectedStorypoint = useMemo(
    () => storypoints.find((storypoint) => storypoint.id === selectedStorypointId) ?? null,
    [selectedStorypointId, storypoints]
  );

  useEffect(() => {
    const stored = window.localStorage.getItem('locally-explained-location');

    if (stored) {
      setUserLocation(JSON.parse(stored) as { lat: number; lng: number });
      setLocationPrompt(false);
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        window.localStorage.setItem('locally-explained-location', JSON.stringify(nextLocation));
        setUserLocation(nextLocation);
        setLocationPrompt(false);
      },
      () => setLocationPrompt(true),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 6_000 }
    );
  }, []);

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

    setRequestStatus('Request submitted. An admin will review it shortly.');
    setRequestMode(false);
    setPickedPoint(null);
  };

  return (
    <main className="container page-grid">
      <section className="hero">
        <div className="hero-copy card">
          <h1>{messages.mapTitle}</h1>
          <p>{messages.mapCopy}</p>
          <div className="content-actions">
            <button className="primary-button" type="button" onClick={() => setRequestMode((value) => !value)}>
              {requestMode ? messages.cancelRequest : messages.requestStorypoint}
            </button>
            <Link className="ghost-button" href={`/${locale}/donations`}>
              {messages.donationsTitle}
            </Link>
          </div>
          {requestStatus ? <div className="notice" style={{ marginTop: 14 }}>{requestStatus}</div> : null}
        </div>
        <aside className="panel">
          <h2>{messages.askLocation}</h2>
          <p>
            The map defaults to Menorca. If you allow location services, the map recenters around your position and keeps a 3 km guide radius.
          </p>
          <div className="content-actions">
            <button
              className="pill"
              type="button"
              onClick={() => {
                setUserLocation(defaultCenter);
                setLocationPrompt(false);
                window.localStorage.setItem('locally-explained-location', JSON.stringify(defaultCenter));
              }}
            >
              {messages.useDefault}
            </button>
            <button
              className="pill"
              type="button"
              onClick={() => {
                navigator.geolocation?.getCurrentPosition((position) => {
                  const nextLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  };
                  setUserLocation(nextLocation);
                  setLocationPrompt(false);
                  window.localStorage.setItem('locally-explained-location', JSON.stringify(nextLocation));
                });
              }}
            >
              {messages.allowLocation}
            </button>
          </div>
        </aside>
      </section>

      <section className="map-card">
        <MapView
          storypoints={storypoints}
          selectedStorypointId={selectedStorypointId}
          onSelectStorypoint={setSelectedStorypointId}
          requestMode={requestMode}
          onMapPick={(point) => setPickedPoint(point)}
          userLocation={userLocation}
        />
        {selectedStorypoint ? (
          <StorypointPreview
            storypoint={selectedStorypoint}
            title={getLocaleStorypoint(selectedStorypoint, locale).title}
            onPlay={() => window.location.assign(`/${locale}/storypoints/${selectedStorypoint.id}`)}
            onClose={() => setSelectedStorypointId(null)}
          />
        ) : null}
        {requestMode && pickedPoint ? (
          <RequestStorypointForm
            locale={locale}
            lat={pickedPoint.lat}
            lng={pickedPoint.lng}
            onSubmit={handleRequestSubmit}
            onCancel={() => {
              setRequestMode(false);
              setPickedPoint(null);
            }}
          />
        ) : null}
      </section>

      {locationPrompt ? (
        <div className="location-prompt">
          <div className="panel-row">
            <strong>{messages.askLocation}</strong>
            <button className="close-button" type="button" onClick={() => setLocationPrompt(false)}>
              X
            </button>
          </div>
          <p className="muted">Default position: Menorca.</p>
        </div>
      ) : null}
    </main>
  );
}
