'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { buildGeodesicCircle } from '@/lib/circle';
import { Storypoint } from '@/lib/types';

const defaultMapCenter: [number, number] = [0, 20];

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }
  ]
};

type Props = {
  storypoints: Storypoint[];
  selectedStorypointId: string | null;
  onSelectStorypoint: (id: string) => void;
  requestMode: boolean;
  onMapPick: (point: { lng: number; lat: number }) => void;
  userLocation: { lat: number; lng: number } | null;
  pendingPoint: { lat: number; lng: number } | null;
};

export function MapView({
  storypoints,
  selectedStorypointId,
  onSelectStorypoint,
  requestMode,
  onMapPick,
  userLocation,
  pendingPoint
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const requestModeRef = useRef(requestMode);
  const onMapPickRef = useRef(onMapPick);

  useEffect(() => {
    requestModeRef.current = requestMode;
  }, [requestMode]);

  useEffect(() => {
    onMapPickRef.current = onMapPick;
  }, [onMapPick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: userLocation ? [userLocation.lng, userLocation.lat] : defaultMapCenter,
      zoom: userLocation ? 11.5 : 10.3
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    mapRef.current = map;

    map.on('click', (event) => {
      if (requestModeRef.current) {
        onMapPickRef.current({ lng: event.lngLat.lng, lat: event.lngLat.lat });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const markers: maplibregl.Marker[] = [];

    storypoints.forEach((storypoint) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'close-button';
      element.style.width = '28px';
      element.style.height = '28px';
      element.style.background = storypoint.id === selectedStorypointId ? '#1d4ed8' : '#ffffff';
      element.style.color = storypoint.id === selectedStorypointId ? '#ffffff' : '#1d4ed8';
      element.style.borderRadius = '999px';
      element.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.22)';
      element.textContent = '•';
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectStorypoint(storypoint.id);
      });

      const marker = new maplibregl.Marker({ element })
        .setLngLat([storypoint.lng, storypoint.lat])
        .addTo(map);

      markers.push(marker);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [onSelectStorypoint, selectedStorypointId, storypoints]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !pendingPoint) {
      return;
    }

    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'request-marker-dot';
    element.setAttribute('aria-label', 'Selected request location');
    element.textContent = '+';

    const marker = new maplibregl.Marker({ element })
      .setLngLat([pendingPoint.lng, pendingPoint.lat])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [pendingPoint]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !userLocation) {
      return;
    }

    map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 12.2, duration: 900 });

    const circleId = 'user-radius-circle';
    const sourceId = 'user-radius-source';

    const addLayer = () => {
      if (map.getLayer(circleId)) {
        map.removeLayer(circleId);
      }

      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [buildGeodesicCircle(userLocation.lat, userLocation.lng, 3000)]
          }
        }
      });

      map.addLayer({
        id: circleId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#2563eb',
          'fill-opacity': 0.08
        }
      });
    };

    if (map.isStyleLoaded()) {
      addLayer();
    } else {
      map.once('load', addLayer);
    }
  }, [userLocation]);

    return (
    <div className="map-shell">
      <div className={`map-frame ${requestMode ? 'request-highlight' : ''}`} ref={containerRef} />
    </div>
  );
}
