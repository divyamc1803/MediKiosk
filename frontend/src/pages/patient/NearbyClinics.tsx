import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ambulanceApi, nearbyDoctorApi } from '../../api/client';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import { useTranslation } from '../../hooks/useTranslation';
import { getDrivingRoute } from '../../services/routeService';

function d(a: number, b: number, c: number, e: number) {
  const R = 6371, p = Math.PI / 180, x = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((e - b) * p / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function NearbyClinics() {
  const { t } = useTranslation();
  const [h, setH] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loc, setLoc] = useState<[number, number]>([26.9124, 75.7873]);
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [route, setRoute] = useState<{ polyline: [number, number][]; distanceKm: number; isRoad: boolean } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    ambulanceApi.getHospitals().then(setH).catch(() => []);
    navigator.geolocation?.getCurrentPosition(
      x => setLoc([x.coords.latitude, x.coords.longitude]),
      () => {}
    );
  }, []);

  useEffect(() => {
    nearbyDoctorApi.get(loc[0], loc[1]).then(setDocs).catch(() => {});
  }, [loc]);

  const list = useMemo(
    () => h.map(x => ({ ...x, km: d(loc[0], loc[1], x.lat, x.lng) })).sort((a, b) => a.km - b.km),
    [h, loc]
  );

  const handleSelectHospital = async (hospital: any) => {
    setSelectedHospital(hospital);

    const [uLat, uLng] = loc;
    const [hLat, hLng] = [hospital.lat, hospital.lng];
    const directKm = d(uLat, uLng, hLat, hLng);
    setRoute({
      polyline: [[uLat, uLng], [hLat, hLng]],
      distanceKm: directKm,
      isRoad: false,
    });

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const roadRoute = await getDrivingRoute(uLat, uLng, hLat, hLng, controller.signal);
      setRoute({
        polyline: roadRoute.polyline,
        distanceKm: roadRoute.distanceKm,
        isRoad: roadRoute.isRoad,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Keep baseline direct route on network/offline fallback
      }
    }
  };

  const markers = [
    {
      id: 'me',
      lat: loc[0],
      lng: loc[1],
      title: t('clinics.your_location', 'Your location'),
      subtitle: t('clinics.starting_point', 'Starting point'),
      icon: 'patient' as const,
    },
    ...list.map(x => {
      const isSelected = selectedHospital && (selectedHospital.id === x.id || selectedHospital.name === x.name);
      return {
        id: `h-${x.id || x.name}`,
        lat: x.lat,
        lng: x.lng,
        title: isSelected ? `🏥 ${x.name} (${t('clinics.selected', 'Selected')})` : x.name,
        subtitle: isSelected && route
          ? `${t('clinics.distance', 'Distance')}: ${route.distanceKm.toFixed(1)} km${route.isRoad ? ` (${t('clinics.road_route', 'road')})` : ''}`
          : `${x.km.toFixed(1)} km • ${x.is_government ? t('clinics.government', 'Government') : t('clinics.private', 'Private')}`,
        icon: 'hospital' as const,
        onClick: () => handleSelectHospital(x),
      };
    }),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black">{t('clinics.title', 'Nearby care')}</h1>
        <p className="text-sm text-gray-500">{t('clinics.subtitle', 'Clinics, hospitals and doctors are shown nearest-first using your location.')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
        <div className="lg:col-span-5 space-y-4 max-h-[650px] overflow-y-auto pt-2 px-1 pb-2 w-full min-w-0">
          <section>
            <h2 className="font-black text-lg mb-2">{t('clinics.hospitals_section', 'Clinics & hospitals')}</h2>
            <div className="space-y-2">
              {list.map(x => {
                const isSelected = selectedHospital && (selectedHospital.id === x.id || selectedHospital.name === x.name);
                return (
                  <article
                    key={x.id || x.name}
                    onClick={() => handleSelectHospital(x)}
                    className={`rounded-2xl p-4 shadow-sm cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-50/40 border-2 border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'bg-white border border-emerald-100 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{x.name}</h3>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-600 text-white shrink-0">
                              {t('clinics.route_active', 'Route Active')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{x.address}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <b className="text-xs text-emerald-700 block">{x.km.toFixed(1)} km</b>
                        {isSelected && route && (
                          <span className="text-[11px] font-bold text-teal-700 block mt-0.5">
                            {t('clinics.distance', 'Distance')}: {route.distanceKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="text-[11px] rounded-full px-2 py-1 bg-emerald-50 text-emerald-700">
                        {x.is_government ? t('clinics.government', 'Government') : t('clinics.private', 'Private')}
                      </span>
                      <span className="text-[11px] rounded-full px-2 py-1 bg-gray-100">
                        {x.emergency_dept ? t('clinics.emergency', 'Emergency') : t('clinics.opd', 'OPD')}
                      </span>
                      {isSelected && (
                        <span className="text-[11px] rounded-full px-2 py-1 bg-teal-100 text-teal-800 font-medium">
                          {t('clinics.showing_on_map', 'Showing on map')}
                        </span>
                      )}
                    </div>
                    {x.phone && (
                      <a
                        href={`tel:${x.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-block mt-3 text-sm font-bold text-emerald-700 hover:underline"
                      >
                        {t('clinics.call', 'Call')} {x.phone} →
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="font-black text-lg mb-2">{t('clinics.doctors_section', 'Doctors nearby')}</h2>
            <div className="space-y-2">
              {docs.slice(0, 12).map(x => (
                <article key={x.id} className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{x.name?.startsWith('Dr.') ? x.name : `Dr. ${x.name || ''}`}</h3>
                      <p className="text-xs text-gray-500">{x.specialization} • {x.department}</p>
                      <p className="text-xs text-gray-500 mt-1">{x.hospital_name}</p>
                    </div>
                    <b className="text-xs text-emerald-700">{x.km.toFixed(1)} km</b>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-7 h-[380px] sm:h-[460px] lg:h-[650px] min-h-[350px] w-full min-w-0 rounded-2xl overflow-hidden relative shadow-sm border border-emerald-100">
          {selectedHospital && route && (
            <div className="absolute top-3 left-3 right-3 z-[500] bg-white/95 backdrop-blur border border-teal-200 rounded-xl p-3 shadow-lg flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                  {t('clinics.route_to', 'Route to')} {selectedHospital.name}
                </span>
                <span className="text-gray-500 mt-0.5 block">
                  {t('clinics.distance', 'Distance')}: <strong className="text-teal-700 font-bold">{route.distanceKm.toFixed(1)} km</strong>
                  {route.isRoad ? ` (${t('clinics.road_route', 'road route')})` : ` (${t('clinics.direct_route', 'direct route')})`}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedHospital(null);
                  setRoute(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold shrink-0 transition-colors"
              >
                {t('clinics.clear_route', 'Clear Route')}
              </button>
            </div>
          )}
          <InteractiveMap
            center={loc}
            zoom={13}
            markers={markers}
            polyline={route?.polyline}
            fitBounds={route?.polyline}
          />
        </div>
      </div>
    </div>
  );
}