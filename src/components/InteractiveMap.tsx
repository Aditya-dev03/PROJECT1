import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coordinates } from '../types';
import { ExtendedMemberLocation } from '../hooks/useLiveLocation';

interface ActivityPin {
  id: string;
  name: string;
  category?: string;
  time?: string;
  photo?: string;
  coordinates: Coordinates;
  address?: string;
}

interface InteractiveMapProps {
  center?: Coordinates;
  zoom?: number;
  activityPins?: ActivityPin[];
  memberLocations?: ExtendedMemberLocation[];
  onSelectActivity?: (pin: ActivityPin) => void;
  selectedCoords?: Coordinates | null;
  height?: string | number;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center = { latitude: 36.4166, longitude: 25.4324 }, // Santorini default
  zoom = 13,
  activityPins = [],
  memberLocations = [],
  onSelectActivity,
  selectedCoords,
  height = '500px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center.latitude, center.longitude],
        zoom: zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    // 1. Render Activity Pins
    const routeCoords: L.LatLngExpression[] = [];

    activityPins.forEach((pin, index) => {
      if (!pin.coordinates?.latitude || !pin.coordinates?.longitude) return;

      const latLng: [number, number] = [pin.coordinates.latitude, pin.coordinates.longitude];
      bounds.extend(latLng);
      routeCoords.push(latLng);
      hasPoints = true;

      const iconHtml = `
        <div style="
          background: #FF5A5F;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(255, 90, 95, 0.45);
          border: 2px solid white;
          cursor: pointer;
        ">
          <div style="transform: rotate(45deg); font-weight: 800; font-size: 11px;">
            ${index + 1}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-activity-pin',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(markersLayer);

      const popupContent = `
        <div style="font-family: var(--font-body); min-width: 180px; padding: 4px;">
          ${pin.photo ? `<img src="${pin.photo}" alt="${pin.name}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />` : ''}
          <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); margin-bottom: 2px;">
            ${pin.name}
          </div>
          ${pin.time ? `<div style="font-size: 11px; font-weight: 600; color: #FF5A5F; margin-bottom: 2px;">⏱ ${pin.time}</div>` : ''}
          ${pin.address ? `<div style="font-size: 11px; color: var(--text-secondary); line-height: 1.3;">📍 ${pin.address}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      if (onSelectActivity) {
        marker.on('click', () => onSelectActivity(pin));
      }
    });

    // 2. Draw Route Polyline
    if (routeCoords.length > 1) {
      polylineRef.current = L.polyline(routeCoords, {
        color: '#FF5A5F',
        weight: 3.5,
        opacity: 0.75,
        dashArray: '6, 8',
      }).addTo(map);
    }

    // 3. Render Member Live Locations
    memberLocations.forEach((m) => {
      if (!m.latitude || !m.longitude) return;

      const latLng: [number, number] = [m.latitude, m.longitude];
      bounds.extend(latLng);
      hasPoints = true;

      const isOnline = m.status === 'online';
      const initials = (m.name || 'U').slice(0, 2).toUpperCase();

      const memberIconHtml = `
        <div style="position: relative; cursor: pointer;">
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 2.5px solid ${isOnline ? '#10B981' : '#6B7280'};
            background: #183048;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          ">
            ${
              m.avatar
                ? `<img src="${m.avatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : `<span style="color: white; font-weight: 700; font-size: 12px;">${initials}</span>`
            }
          </div>
          <div style="
            position: absolute;
            bottom: -1px;
            right: -1px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${isOnline ? '#10B981' : '#EF4444'};
            border: 2px solid white;
          "></div>
        </div>
      `;

      const memberIcon = L.divIcon({
        className: 'custom-member-pin',
        html: memberIconHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -20],
      });

      const marker = L.marker(latLng, { icon: memberIcon }).addTo(markersLayer);
      marker.bindPopup(`
        <div style="font-family: var(--font-body); padding: 4px;">
          <div style="font-weight: 700; font-size: 13px;">${m.name}</div>
          <div style="font-size: 11px; color: ${isOnline ? '#10B981' : '#94A3B8'}; font-weight: 600;">
            ● ${isOnline ? 'Active Now' : 'Offline'} · ${m.area || 'Nearby'}
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
            Distance: <strong>${m.distanceStr || '--'}</strong>
          </div>
        </div>
      `);
    });

    // Fit map bounds if points exist
    if (hasPoints && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [activityPins, memberLocations]);

  // Handle programmatic pan / focus on selectedCoords
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedCoords) return;
    map.flyTo([selectedCoords.latitude, selectedCoords.longitude], 15, { duration: 1.2 });
  }, [selectedCoords]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-color)',
      }}
    />
  );
};
