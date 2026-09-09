import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ambulanceApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { InteractiveMap, MarkerData } from '../../components/map/InteractiveMap';
import { DEMO_CONFIG } from '../../config/demoConfig';
import { useTranslation } from '../../hooks/useTranslation';
import { getDrivingRoute } from '../../services/routeService';
import type { AmbulanceRequest as AmbulanceRequestType, Hospital } from '../../types';

interface NearbyAmbulanceItem {
  ambulance_id: string;
  registration_number: string;
  distance_km: number;
  eta_minutes: number;
  type: 'BASIC' | 'ALS' | 'ICU';
  status: string;
  lat: number;
  lng: number;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
}

export function AmbulanceRequest() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if routed with pre-detected emergency symptoms
  const navState = location.state as { priority?: string; redFlags?: any[] } | undefined;
  const initialPriority = navState?.priority || 'HIGH';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Pickup Location (defaults to configured Jaipur Demo Location)
  const [pickupLat, setPickupLat] = useState<number>(DEMO_CONFIG.patient.lat);
  const [pickupLng, setPickupLng] = useState<number>(DEMO_CONFIG.patient.lng);
  const [pickupAddress, setPickupAddress] = useState<string>(DEMO_CONFIG.patient.address);
  const [landmark, setLandmark] = useState<string>(DEMO_CONFIG.patient.landmark);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<typeof DEMO_CONFIG.quickLocations>([]);
  const [locationFetched, setLocationFetched] = useState(false);

  // Step 2: Destination Hospital
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [step2Polyline, setStep2Polyline] = useState<[number, number][] | null>(null);

  // Step 3: Ambulance Type & Nearby Matches
  const [nearbyAmbulances, setNearbyAmbulances] = useState<NearbyAmbulanceItem[]>([]);
  const [selectedType, setSelectedType] = useState<'BASIC' | 'ALS' | 'ICU'>('ALS');
  const [priority] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>(initialPriority as any);

  // Step 4: Active Request & Live Tracking
  const [activeRequest, setActiveRequest] = useState<AmbulanceRequestType | null>(null);
  const [ambLat, setAmbLat] = useState<number>(DEMO_CONFIG.driver.lat);
  const [ambLng, setAmbLng] = useState<number>(DEMO_CONFIG.driver.lng);
  const [liveEta, setLiveEta] = useState<number>(5);
  const [roadPolyline, setRoadPolyline] = useState<[number, number][] | null>(null);

  // WebSocket for Live Tracking
  const { messages: wsMessages, isConnected: isTrackingConnected } = useWebSocket(activeRequest ? `ambulance_${activeRequest.id}` : null);

  // Fetch Hospitals on Mount
  useEffect(() => {
    const init = async () => {
      try {
        const hospList = await ambulanceApi.getHospitals();
        setHospitals(hospList);
        if (hospList.length > 0) {
          // Select Fortis Escorts or SMS Hospital default in Jaipur
          const preferred = hospList.find(h => h.name.includes('Fortis') || h.name.includes('SMS')) || hospList[0];
          setSelectedHospital(preferred);
        }
      } catch (err) {
        console.error('Failed to load hospitals', err);
      }
    };
    init();
  }, []);

  // Handle Real-time WebSocket Location and Status Updates
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latest = wsMessages[wsMessages.length - 1];
      if (latest.type === 'location_update' && latest.data) {
        setAmbLat(latest.data.lat);
        setAmbLng(latest.data.lng);
        if (latest.data.eta) setLiveEta(latest.data.eta);
        if (activeRequest && latest.data.target_status && latest.data.is_arrived) {
          setActiveRequest(prev => prev ? { ...prev, status: latest.data.target_status } : null);
        }
      } else if (latest.type === 'ROUTE_READY' && latest.polyline && latest.polyline.length > 0) {
        setRoadPolyline(latest.polyline);
      } else if (latest.type === 'DRIVER_ACCEPTED' || latest.type === 'STATUS_UPDATED') {
        if (latest.request) {
          setActiveRequest(latest.request);
          if (latest.request.route && latest.request.route.length > 0) {
            setRoadPolyline(latest.request.route);
          }
        } else if (activeRequest?.id && latest.request_id) {
          ambulanceApi.get(activeRequest.id).then(req => {
            setActiveRequest(req);
            if ((req as any).route && (req as any).route.length > 0) {
              setRoadPolyline((req as any).route);
            }
          }).catch(() => undefined);
        }
      }
    }
  }, [wsMessages]);

  // Synchronize road polyline for active emergency request
  useEffect(() => {
    if (!activeRequest || step !== 4) return;
    if ((activeRequest as any).route && (activeRequest as any).route.length > 0) {
      setRoadPolyline((activeRequest as any).route);
    }
    const isEnRouteToHospital = ['PATIENT_PICKED_UP', 'EN_ROUTE_HOSPITAL', 'ARRIVED', 'COMPLETED'].includes(activeRequest.status);
    const sLat = isEnRouteToHospital ? activeRequest.pickup_lat : (activeRequest.driver?.current_lat || ambLat || DEMO_CONFIG.driver.lat);
    const sLng = isEnRouteToHospital ? activeRequest.pickup_lng : (activeRequest.driver?.current_lng || ambLng || DEMO_CONFIG.driver.lng);
    const eLat = isEnRouteToHospital ? activeRequest.destination_lat : activeRequest.pickup_lat;
    const eLng = isEnRouteToHospital ? activeRequest.destination_lng : activeRequest.pickup_lng;

    getDrivingRoute(sLat, sLng, eLat, eLng).then(r => {
      if (r && r.polyline && r.polyline.length > 0) {
        setRoadPolyline(r.polyline);
      }
    }).catch(() => {});
  }, [activeRequest?.id, activeRequest?.status, step]);

  // Step 2 road route preview to selected hospital
  useEffect(() => {
    if (step === 2 && selectedHospital) {
      getDrivingRoute(pickupLat, pickupLng, selectedHospital.lat, selectedHospital.lng).then(r => {
        if (r && r.polyline) setStep2Polyline(r.polyline);
      }).catch(() => {});
    }
  }, [step, selectedHospital, pickupLat, pickupLng]);

  // Handle Search Input autocomplete for Jaipur localities
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setFilteredLocations([]);
      return;
    }
    const matched = DEMO_CONFIG.quickLocations.filter(loc =>
      loc.name.toLowerCase().includes(q.toLowerCase()) || loc.address.toLowerCase().includes(q.toLowerCase())
    );
    setFilteredLocations(matched);
  };

  const selectQuickLocation = (loc: typeof DEMO_CONFIG.quickLocations[0]) => {
    setPickupLat(loc.lat);
    setPickupLng(loc.lng);
    setPickupAddress(loc.address);
    setLandmark(loc.name);
    setSearchQuery('');
    setFilteredLocations([]);
  };

  // Browser Geolocation with fallback to Jaipur Demo
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickupLat(pos.coords.latitude);
          setPickupLng(pos.coords.longitude);
          setPickupAddress(`Current GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setLandmark('Current Device GPS');
          setLocationFetched(true);
        },
        () => {
          // Fallback to Jaipur Demo Coordinates
          setPickupLat(DEMO_CONFIG.patient.lat);
          setPickupLng(DEMO_CONFIG.patient.lng);
          setPickupAddress(DEMO_CONFIG.patient.address);
          setLandmark(DEMO_CONFIG.patient.landmark);
          setLocationFetched(true);
        }
      );
    } else {
      setPickupLat(DEMO_CONFIG.patient.lat);
      setPickupLng(DEMO_CONFIG.patient.lng);
      setPickupAddress(DEMO_CONFIG.patient.address);
      setLandmark(DEMO_CONFIG.patient.landmark);
      setLocationFetched(true);
    }
  };

  // Step 1 -> Step 2: Confirm Pickup
  const handleConfirmPickup = () => {
    setStep(2);
  };

  // Step 2 -> Step 3: Select Hospital & Find Nearby Ambulances
  const handleConfirmHospital = async (hosp: Hospital) => {
    setSelectedHospital(hosp);
    setLoading(true);
    try {
      const nearby: any = await ambulanceApi.getNearby(pickupLat, pickupLng);
      setNearbyAmbulances(nearby);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Failed to search nearby ambulances');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> Step 4: Dispatch Request
  const handleSubmitRequest = async () => {
    if (!selectedHospital) return;
    setLoading(true);
    try {
      const req: any = await ambulanceApi.request({
        patient_id: user?.id || '1',
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        pickup_address: pickupAddress,
        destination_lat: selectedHospital.lat,
        destination_lng: selectedHospital.lng,
        destination_address: selectedHospital.address,
        destination_hospital_id: selectedHospital.id,
        ambulance_type_requested: selectedType,
        priority: priority,
      });

      setActiveRequest(req);
      if (req.driver && req.driver.current_lat != null && req.driver.current_lng != null) {
        setAmbLat(req.driver.current_lat);
        setAmbLng(req.driver.current_lng);
      }
      setStep(4);
    } catch (err) {
      console.error(err);
      alert('Failed to dispatch ambulance request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare Map Markers based on current step
  const markers: MarkerData[] = [];

  // Patient Pickup Marker
  markers.push({
    id: 'patient-pickup',
    lat: pickupLat,
    lng: pickupLng,
    title: '📍 Patient Pickup',
    subtitle: pickupAddress,
    icon: 'patient',
    draggable: step === 1,
    onDragEnd: (lat, lng) => {
      setPickupLat(lat);
      setPickupLng(lng);
      setPickupAddress(`Jaipur Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setLandmark('Custom Selected Map Pin');
    },
  });

  // Hospitals Markers
  if (step === 2 || step === 3 || step === 4) {
    hospitals.forEach(h => {
      markers.push({
        id: `hosp-${h.id}`,
        lat: h.lat,
        lng: h.lng,
        title: `🏥 ${h.name}`,
        subtitle: `${h.address} • ER: ${h.emergency_dept ? 'Yes' : 'No'}`,
        icon: 'hospital',
        onClick: () => {
          if (step === 2) handleConfirmHospital(h);
        },
      });
    });
  }

  // Nearby Ambulance Markers (in Step 3)
  if (step === 3) {
    nearbyAmbulances.forEach(a => {
      markers.push({
        id: `amb-${a.ambulance_id}`,
        lat: a.lat,
        lng: a.lng,
        title: `🚑 ${a.registration_number || 'Ambulance'} (${a.type})`,
        subtitle: `Driver: ${a.driver_name || 'Assigned'} • ${a.distance_km} km away (~${a.eta_minutes}m)`,
        icon: 'ambulance',
        onClick: () => setSelectedType(a.type),
      });
    });
  }

  // Active Dispatched Ambulance Marker (in Step 4)
  if (step === 4 && ambLat && ambLng) {
    markers.push({
      id: 'active-ambulance',
      lat: ambLat,
      lng: ambLng,
      title: `🚑 ${activeRequest?.ambulance?.registration_number || 'AMB-104'} (${activeRequest?.ambulance_type_requested || 'ALS'})`,
      subtitle: `Driver: ${activeRequest?.driver?.user?.full_name || 'Raj Kumar'} • Live Tracking`,
      icon: 'ambulance',
    });
  }

  // Route Polyline (authoritative road coordinates)
  let polyline: [number, number][] | undefined = undefined;
  if (step === 4 && activeRequest) {
    if (roadPolyline && roadPolyline.length > 0) {
      polyline = roadPolyline;
    } else {
      const isEnRouteToHospital = ['PATIENT_PICKED_UP', 'EN_ROUTE_HOSPITAL', 'ARRIVED'].includes(activeRequest.status);
      polyline = isEnRouteToHospital
        ? [
            [ambLat || activeRequest.pickup_lat, ambLng || activeRequest.pickup_lng],
            [activeRequest.destination_lat, activeRequest.destination_lng],
          ]
        : [
            [ambLat || activeRequest.pickup_lat, ambLng || activeRequest.pickup_lng],
            [activeRequest.pickup_lat, activeRequest.pickup_lng],
          ];
    }
  } else if (step === 2 && step2Polyline && step2Polyline.length > 0) {
    polyline = step2Polyline;
  }

  return (
    <div className="max-w-4xl mx-auto min-h-[calc(100vh-100px)] bg-white flex flex-col rounded-3xl shadow-xl border border-gray-200 overflow-hidden relative">
      
      {/* Header Bar */}
      <div className="bg-gray-950 text-white p-4 px-6 flex items-center justify-between border-b border-gray-800 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚑</span>
          <div>
            <h1 className="font-bold text-lg leading-tight">{t('ambulance.network_title', 'Jaipur Emergency Ambulance Network')}</h1>
            <p className="text-xs text-teal-400">{t('ambulance.dispatch_mode', 'Jaipur, Rajasthan • Real-Time Dispatch Mode')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {priority === 'CRITICAL' && (
            <span className="bg-red-600/90 text-white font-bold text-xs px-3 py-1 rounded-full animate-pulse flex items-center gap-1 shadow-sm">
              🚨 {t('ambulance.critical_badge', 'CRITICAL EMERGENCY')}
            </span>
          )}
          <button
            onClick={() => navigate('/patient')}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800"
          >
            {t('common.exit', 'Exit')}
          </button>
        </div>
      </div>

      {/* STEP 1: PICKUP LOCATION SELECTION */}
      {step === 1 && (
        <div className="flex-1 flex flex-col md:flex-row h-full">
          {/* Controls Sidebar */}
          <div className="w-full md:w-96 p-5 bg-white border-r border-gray-100 flex flex-col justify-between z-10 shrink-0 overflow-y-auto max-h-[45vh] md:max-h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('ambulance.pickup_title', 'Where to pick you up?')}</h2>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-full">{t('ambulance.step_1', 'Step 1 of 3')}</span>
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder={t('ambulance.search_placeholder', 'Search Jaipur address / place...')}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
                {filteredLocations.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 z-50 overflow-hidden divide-y divide-gray-100">
                    {filteredLocations.map((loc) => (
                      <div
                        key={loc.name}
                        onClick={() => selectQuickLocation(loc)}
                        className="p-2.5 px-4 text-xs hover:bg-teal-50 cursor-pointer font-medium text-gray-700"
                      >
                        <p className="font-bold text-gray-900">{loc.name}</p>
                        <p className="text-gray-500 truncate">{loc.address}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Use My Location Button */}
              <button
                onClick={handleUseMyLocation}
                className="w-full mb-4 flex items-center justify-center gap-2 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold rounded-xl text-xs transition-colors border border-teal-200"
              >
                <span>🎯</span> {t('ambulance.use_my_gps', 'Use My GPS / Default Location')}
              </button>

              {/* Selected Location Card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-lg mt-0.5">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ambulance.pickup_address_label', 'Pickup Address')}</p>
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => {
                        if (locationFetched) {
                          setPickupAddress('');
                          setLocationFetched(false);
                        } else {
                          setPickupAddress(e.target.value);
                        }
                      }}
                      className={`${locationFetched ? 'bg-gray-100' : 'bg-transparent'} w-full border-none focus:outline-none text-sm font-semibold text-gray-900`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 text-[11px] text-gray-500 font-mono">
                  <div>
                    <span className="font-bold text-gray-700">Lat:</span> {pickupLat.toFixed(4)}
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">Lng:</span> {pickupLng.toFixed(4)}
                  </div>
                </div>
                {landmark && (
                  <p className="text-xs text-teal-700 font-medium bg-teal-50/50 p-2 rounded-lg">
                    🏛️ Landmark: {landmark}
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-4 italic">
                💡 Tip: You can click anywhere on the map or drag the red pin to adjust your pickup location.
              </p>
            </div>

            <Button
              className="w-full shadow-lg shadow-teal-600/20 text-base py-3"
              onClick={handleConfirmPickup}
            >
              {t('ambulance.confirm_pickup', 'Confirm Pickup Location')} →
            </Button>
          </div>

          {/* Map Area */}
          <div className="flex-1 w-full min-w-0 h-[380px] sm:h-[460px] md:h-full min-h-[350px] relative">
            <InteractiveMap
              center={[pickupLat, pickupLng]}
              zoom={14}
              markers={markers}
              onMapClick={(lat, lng) => {
                setPickupLat(lat);
                setPickupLng(lng);
                setPickupAddress(`Selected Location on Map (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
                setLandmark('Custom Pin Location');
              }}
              height="100%"
            />
          </div>
        </div>
      )}

      {/* STEP 2: DESTINATION HOSPITAL SELECTION */}
      {step === 2 && (
        <div className="flex-1 flex flex-col md:flex-row h-full">
          <div className="w-full md:w-96 p-5 bg-white border-r border-gray-100 flex flex-col justify-between z-10 shrink-0 overflow-y-auto max-h-[45vh] md:max-h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setStep(1)} className="text-xs font-bold text-gray-500 hover:text-gray-900">
                  ← {t('ambulance.back_to_pickup', 'Back to Pickup')}
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{t('ambulance.where_to_go', 'Where are you going?')}</h2>
              <p className="text-xs text-gray-500 mb-4">{t('ambulance.choose_hospital_desc', 'Choose a Jaipur emergency hospital or select directly from the map.')}</p>

              <div className="space-y-3 mb-6">
                {hospitals.map((h) => {
                  const isSelected = selectedHospital?.id === h.id;
                  return (
                    <div
                      key={h.id}
                      onClick={() => setSelectedHospital(h)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                          : 'border-gray-200 hover:border-teal-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-sm text-gray-900">{h.name}</h3>
                        {h.emergency_dept && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            24/7 ER
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mb-2">{h.address}</p>
                      <div className="flex items-center gap-3 text-xs text-teal-700 font-medium">
                        <span>⏱️ ~10-15 min</span>
                        <span>📞 {h.phone}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full shadow-lg shadow-teal-600/20 text-base py-3"
              disabled={!selectedHospital || loading}
              loading={loading}
              onClick={() => selectedHospital && handleConfirmHospital(selectedHospital)}
            >
              {t('ambulance.select_hospital_btn', 'Select Hospital & Find Ambulances')} →
            </Button>
          </div>

          <div className="flex-1 w-full min-w-0 h-[380px] sm:h-[460px] md:h-full min-h-[350px] relative">
            <InteractiveMap
              center={selectedHospital ? [selectedHospital.lat, selectedHospital.lng] : [pickupLat, pickupLng]}
              zoom={13}
              markers={markers}
              polyline={step2Polyline || undefined}
              height="100%"
            />
          </div>
        </div>
      )}

      {/* STEP 3: AMBULANCE TYPE SELECTION & MATCHING */}
      {step === 3 && (
        <div className="flex-1 flex flex-col md:flex-row h-full">
          <div className="w-full md:w-96 p-5 bg-white border-r border-gray-100 flex flex-col justify-between z-10 shrink-0 overflow-y-auto max-h-[45vh] md:max-h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setStep(2)} className="text-xs font-bold text-gray-500 hover:text-gray-900">
                  ← {t('ambulance.back_to_hospitals', 'Back to Hospitals')}
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{t('ambulance.auto_select_title', 'Nearest ambulance selected automatically')}</h2>
              <p className="text-xs text-gray-500 mb-4">
                {t('ambulance.auto_select_desc', 'MediKiosk selects the nearest available ambulance automatically. You do not need to choose a vehicle type.')}
              </p>

              {/* Ambulance Cards */}
              <div className="space-y-3 mb-6">
                {nearbyAmbulances.map((amb) => {
                  const isSelected = amb.registration_number === nearbyAmbulances[0]?.registration_number;
                  const isTopMatch = amb.registration_number === 'AMB-104';
                  return (
                    <div
                      key={amb.ambulance_id}
                      
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/70 shadow-md'
                          : 'border-gray-200 hover:border-teal-300 bg-white'
                      }`}
                    >
                      {isTopMatch && (
                        <span className="absolute -top-2.5 right-3 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                          ⭐ {t('ambulance.nearest_match', 'Nearest Match (~1.5 km)')}
                        </span>
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                            <span>🚑 {amb.registration_number}</span>
                            <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                              {amb.type}
                            </span>
                          </h3>
                          <p className="text-xs text-gray-500">{t('ambulance.driver_label', 'Driver')}: {amb.driver_name || 'Raj Kumar'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-teal-700">{amb.eta_minutes} {t('ambulance.min_unit', 'min')}</span>
                          <p className="text-[11px] text-gray-400 font-mono">{amb.distance_km} km</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {amb.type === 'ALS' && 'Equipped with ECG, Defibrillator, Life Support & Paramedic'}
                        {amb.type === 'BASIC' && 'Equipped with Standard Oxygen, First Aid & Stretcher'}
                        {amb.type === 'ICU' && 'Equipped with Advanced Ventilator & Critical Care Unit'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full shadow-lg shadow-teal-600/30 text-base py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold"
              loading={loading}
              onClick={handleSubmitRequest}
            >
              🚨 {t('ambulance.request_btn', 'REQUEST AMBULANCE NOW')}
            </Button>
          </div>

          <div className="flex-1 w-full min-w-0 h-[380px] sm:h-[460px] md:h-full min-h-[350px] relative">
            <InteractiveMap
              center={[pickupLat, pickupLng]}
              zoom={14}
              markers={markers}
              height="100%"
            />
          </div>
        </div>
      )}

      {/* STEP 4: LIVE TRACKING & AMBULANCE DISPATCH */}
      {step === 4 && activeRequest && (
        <div className="flex-1 flex flex-col h-full relative">
          {/* Top Live Status Banner */}
          <div className="bg-white/95 backdrop-blur-md p-4 px-6 border-b border-gray-200 z-10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl flex items-center justify-center text-2xl shadow-inner animate-bounce">
                🚑
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 leading-tight">
                  {activeRequest.status === 'SEARCHING' && t('ambulance.status_searching', 'Connecting to Nearest Driver...')}
                  {activeRequest.status === 'MATCHED' && t('ambulance.status_matched', 'Driver Assigned • Waiting for Acceptance')}
                  {['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE'].includes(activeRequest.status) && t('ambulance.status_en_route', 'Driver is on the way!')}
                  {activeRequest.status === 'ARRIVING' && t('ambulance.status_arriving', 'Ambulance is Arriving at Pickup!')}
                  {activeRequest.status === 'PATIENT_PICKED_UP' && t('ambulance.status_picked_up', 'Patient Picked Up • En Route to Hospital')}
                  {activeRequest.status === 'EN_ROUTE_HOSPITAL' && t('ambulance.status_to_hospital', 'Travelling to Hospital')}
                  {activeRequest.status === 'ARRIVED' && t('ambulance.status_arrived', 'Arrived at Hospital!')}
                  {activeRequest.status === 'COMPLETED' && t('ambulance.status_completed', 'Trip Completed Successfully')}
                </h2>
                <p className="text-xs text-gray-500">
                  {t('ambulance.destination_label', 'Destination')}: <span className="font-semibold text-gray-800">{activeRequest.destination_address || 'Jaipur Hospital'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${isTrackingConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{isTrackingConnected ? `● ${t('ambulance.live_tracking', 'LIVE TRACKING')}` : `○ ${t('ambulance.reconnecting', 'RECONNECTING')}`}</span>
              <div className="bg-teal-50 border border-teal-200 px-4 py-2 rounded-2xl text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">{t('ambulance.estimated_arrival', 'Estimated Arrival')}</p>
                <p className="text-xl font-black text-teal-700">~{liveEta} {t('ambulance.min_unit', 'min')}</p>
              </div>
              <StatusBadge status={activeRequest.status} />
            </div>
          </div>

          {/* Fullscreen Interactive Map */}
          <div className="flex-1 w-full min-w-0 relative h-[400px] sm:h-[480px] md:h-full min-h-[360px]">
            <InteractiveMap
              center={[ambLat || activeRequest.pickup_lat, ambLng || activeRequest.pickup_lng]}
              zoom={14}
              markers={markers}
              polyline={polyline}
              height="100%"
            />
          </div>

          {/* Bottom Driver Info Drawer */}
          <div className="bg-white border-t border-gray-200 p-5 px-6 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl border border-gray-200 shadow-inner">
                👨‍✈️
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {activeRequest.driver?.user?.full_name || 'Raj Kumar'}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  {activeRequest.ambulance?.registration_number || 'AMB-104'} • {activeRequest.ambulance_type_requested} Ambulance
                </p>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                  ⭐ 4.9 {t('ambulance.rating', 'Rating')} • Jaipur Emergency Division
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`tel:${activeRequest.driver?.user?.phone || '+919829012345'}`}
                className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-xl text-sm flex items-center gap-2 border border-teal-200 transition-colors shadow-sm"
              >
                <span>📞</span> {t('ambulance.call_driver', 'Call Driver')}
              </a>
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => {
                  if (activeRequest) {
                    const currentLeg = ['PATIENT_PICKED_UP', 'EN_ROUTE_HOSPITAL'].includes(activeRequest.status) ? 'to_hospital' : 'to_patient';
                    ambulanceApi.simulateMovement(activeRequest.id, currentLeg);
                  }
                }}
              >
                ⏩ Simulate Move
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
