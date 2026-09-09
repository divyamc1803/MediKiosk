import { ambulanceApi } from '../api/client';

export interface DrivingRoute {
  polyline: [number, number][];
  distanceKm: number;
  durationSeconds: number;
  isRoad: boolean;
}

const routeCache = new Map<string, DrivingRoute>();

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getDrivingRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  signal?: AbortSignal
): Promise<DrivingRoute> {
  const cacheKey = `${fromLat.toFixed(5)},${fromLng.toFixed(5)}->${toLat.toFixed(5)},${toLng.toFixed(5)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // 1. Try authoritative backend route first (backed by server-side OSRM & pre-mapped Jaipur corridors)
  try {
    const res = await ambulanceApi.getRoute(fromLat, fromLng, toLat, toLng);
    if (res && res.coordinates && res.coordinates.length > 0) {
      const result: DrivingRoute = {
        polyline: res.coordinates,
        distanceKm: res.distance_km || calculateDistanceKm(fromLat, fromLng, toLat, toLng),
        durationSeconds: res.duration_seconds || 300,
        isRoad: res.is_road ?? true,
      };
      routeCache.set(cacheKey, result);
      return result;
    }
  } catch (backendErr) {
    console.warn('[routeService] Backend route lookup failed, attempting direct OSRM...', backendErr);
  }

  // 2. Direct browser fetch to OSRM
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );
        const result: DrivingRoute = {
          polyline: coords,
          distanceKm: data.routes[0].distance / 1000,
          durationSeconds: data.routes[0].duration || 300,
          isRoad: true,
        };
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (osrmErr: any) {
    if (osrmErr.name === 'AbortError') {
      throw osrmErr;
    }
    console.warn('[routeService] Direct OSRM fetch failed', osrmErr);
  }

  // 3. Fallback to direct baseline
  const fallbackKm = calculateDistanceKm(fromLat, fromLng, toLat, toLng);
  return {
    polyline: [[fromLat, fromLng], [toLat, toLng]],
    distanceKm: fallbackKm,
    durationSeconds: (fallbackKm / 40.0) * 3600,
    isRoad: false,
  };
}
