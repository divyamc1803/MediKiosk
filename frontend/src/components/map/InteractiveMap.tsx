import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const patientMarkerIcon = new L.DivIcon({
  className: 'custom-patient-marker',
  html: `<div style="background:#ef4444;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,.3)">📍</div>`,
  iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -34],
});
export const ambulanceMarkerIcon = new L.DivIcon({
  className: 'custom-ambulance-marker',
  html: `<div style="background:#059669;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:21px;border:3px solid white;box-shadow:0 4px 12px rgba(13,148,136,.5)">🚑</div>`,
  iconSize: [42, 42], iconAnchor: [21, 21], popupAnchor: [0, -19],
});
export const hospitalMarkerIcon = new L.DivIcon({
  className: 'custom-hospital-marker',
  html: `<div style="background:#2563eb;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;border:3px solid white;box-shadow:0 4px 10px rgba(37,99,235,.4)">🏥</div>`,
  iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -34],
});

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    // 1. Invalidate size on next frame and after CSS transitions
    const af = requestAnimationFrame(() => {
      try { map.invalidateSize(); } catch (e) {}
    });
    const t1 = setTimeout(() => {
      try { map.invalidateSize(); } catch (e) {}
    }, 150);
    const t2 = setTimeout(() => {
      try { map.invalidateSize(); } catch (e) {}
    }, 450);

    // 2. Invalidate size on window resize and mobile orientation change
    const handleResize = () => {
      try { map.invalidateSize(); } catch (e) {}
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // 3. Observe the map's container DOM element directly
    let ro: ResizeObserver | null = null;
    try {
      const container = map.getContainer();
      if (container && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          try { map.invalidateSize(); } catch (e) {}
        });
        ro.observe(container);
      }
    } catch (e) {}

    return () => {
      cancelAnimationFrame(af);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (ro) ro.disconnect();
    };
  }, [map]);
  return null;
}

function MapRecenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    try {
      map.invalidateSize();
      map.setView(center, zoom ?? map.getZoom(), { animate: true, duration: 0.35 });
    } catch (e) {}
  }, [center, zoom, map]);
  return null;
}

function MapFitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.invalidateSize();
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], animate: true, maxZoom: 16 });
      } catch (e) {}
    }
  }, [bounds, map]);
  return null;
}

function LocationPicker({ onLocationSelect }: { onLocationSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onLocationSelect?.(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  icon?: 'patient' | 'ambulance' | 'hospital';
  draggable?: boolean;
  onDragEnd?: (lat: number, lng: number) => void;
  onClick?: () => void;
}

function MapMarker({ marker }: { marker: MarkerData }) {
  let icon = patientMarkerIcon;
  if (marker.icon === 'ambulance') icon = ambulanceMarkerIcon;
  if (marker.icon === 'hospital') icon = hospitalMarkerIcon;

  const eventHandlers = {
    dragend(e: L.DragEndEvent) {
      if (marker.onDragEnd) {
        const { lat, lng } = e.target.getLatLng();
        marker.onDragEnd(lat, lng);
      }
    },
    click() { marker.onClick?.(); },
  };

  return (
    <Marker position={[marker.lat, marker.lng]} icon={icon} draggable={!!marker.draggable} eventHandlers={eventHandlers}>
      <Popup>
        <div className="p-1 min-w-[140px]">
          <p className="font-bold text-gray-900 text-sm">{marker.title}</p>
          {marker.subtitle && <p className="text-xs text-gray-500">{marker.subtitle}</p>}
        </div>
      </Popup>
    </Marker>
  );
}

export interface InteractiveMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  polyline?: [number, number][];
  fitBounds?: [number, number][];
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export function InteractiveMap({
  center,
  zoom = 13,
  markers = [],
  polyline,
  fitBounds,
  onMapClick,
  height,
  className = '',
}: InteractiveMapProps) {
  const resolvedHeight = height || '100%';
  return (
    <div
      style={{ height: resolvedHeight, width: '100%', minHeight: 320 }}
      className={`relative z-0 w-full min-w-0 max-w-full overflow-hidden ${!height ? 'h-[360px] sm:h-[450px] md:h-[520px] lg:h-[600px]' : ''} ${className}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', minHeight: 320 }}
        zoomControl
        scrollWheelZoom
      >
        <MapResizeHandler />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {fitBounds && fitBounds.length >= 2 ? (
          <MapFitBounds bounds={fitBounds} />
        ) : (
          <MapRecenter center={center} zoom={zoom} />
        )}
        {onMapClick && <LocationPicker onLocationSelect={onMapClick} />}
        {markers.map(marker => <MapMarker key={marker.id} marker={marker} />)}
        {polyline && polyline.length >= 2 && (
          <Polyline
            positions={polyline}
            color="#0d9488"
            weight={5}
            opacity={0.85}
            lineCap="round"
          />
        )}
      </MapContainer>
    </div>
  );
}
