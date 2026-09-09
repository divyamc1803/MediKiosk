import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ambulanceApi } from '../../api/client';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { InteractiveMap, MarkerData } from '../../components/map/InteractiveMap';
import { DEMO_CONFIG } from '../../config/demoConfig';
import { getDrivingRoute } from '../../services/routeService';
import type { AmbulanceRequest, Hospital } from '../../types';

export function HospitalDashboard() {
  const { user, logout } = useAuth();
  const [activeRequests, setActiveRequests] = useState<AmbulanceRequest[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [roadPolyline, setRoadPolyline] = useState<[number, number][] | null>(null);
  const [loading, setLoading] = useState(true);

  // Live WebSocket for hospital dispatch updates
  const { messages: wsMessages } = useWebSocket('hospital_dispatch');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wsMessages.length > 0) {
      const latest = wsMessages[wsMessages.length - 1];
      if (latest.type === 'AMBULANCE_REQUEST_CREATED' && latest.request) {
        setActiveRequests(prev => [latest.request, ...prev.filter(r => r.id !== latest.request.id)]);
      } else if (latest.type === 'ROUTE_READY' && latest.polyline && latest.polyline.length > 0) {
        setRoadPolyline(latest.polyline);
      } else if (latest.type === 'STATUS_UPDATED' && latest.request) {
        setActiveRequests(prev => prev.map(r => r.id === latest.request.id ? latest.request : r));
      } else if (latest.type === 'location_update' && latest.data) {
        setActiveRequests(prev => prev.map(r => {
          if (r.id !== latest.request_id) return r;
          return {
            ...r,
            estimated_eta: latest.data.eta ?? r.estimated_eta,
            driver: r.driver ? { ...r.driver, current_lat: latest.data.lat, current_lng: latest.data.lng } : r.driver,
          };
        }));
      } else if (latest.type === 'STATUS_UPDATED' && latest.request_id) {
        // Simulator status events are intentionally lightweight; refresh the authoritative request.
        ambulanceApi.get(latest.request_id).then(updated => {
          setActiveRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
        }).catch(() => undefined);
      }
    }
  }, [wsMessages]);

  const fetchData = async () => {
    try {
      const [hospList, reqList] = await Promise.all([
        ambulanceApi.getHospitals(),
        ambulanceApi.getActive()
      ]);
      setHospitals(hospList);
      setActiveRequests(reqList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const criticalRequest = activeRequests.find(r => r.priority === 'CRITICAL' && !['COMPLETED', 'CANCELLED'].includes(r.status));
  const activeRoadRequest = criticalRequest || activeRequests.find(r => !['COMPLETED', 'CANCELLED'].includes(r.status));

  useEffect(() => {
    if (!activeRoadRequest) {
      setRoadPolyline(null);
      return;
    }
    if ((activeRoadRequest as any).route && (activeRoadRequest as any).route.length > 0) {
      setRoadPolyline((activeRoadRequest as any).route);
    }
    const isEnRouteToHospital = ['PATIENT_PICKED_UP', 'EN_ROUTE_HOSPITAL', 'ARRIVED', 'COMPLETED'].includes(activeRoadRequest.status);
    const startLat = isEnRouteToHospital ? activeRoadRequest.pickup_lat : (activeRoadRequest.driver?.current_lat || DEMO_CONFIG.driver.lat);
    const startLng = isEnRouteToHospital ? activeRoadRequest.pickup_lng : (activeRoadRequest.driver?.current_lng || DEMO_CONFIG.driver.lng);
    const endLat = isEnRouteToHospital ? activeRoadRequest.destination_lat : activeRoadRequest.pickup_lat;
    const endLng = isEnRouteToHospital ? activeRoadRequest.destination_lng : activeRoadRequest.pickup_lng;

    getDrivingRoute(startLat, startLng, endLat, endLng).then(r => {
      if (r && r.polyline && r.polyline.length > 0) {
        setRoadPolyline(r.polyline);
      }
    }).catch(() => {});
  }, [activeRoadRequest?.id, activeRoadRequest?.status]);

  // Build Interactive Map Markers
  const markers: MarkerData[] = [];

  // Hospital markers in Jaipur
  hospitals.forEach(h => {
    markers.push({
      id: `hosp-${h.id}`,
      lat: h.lat,
      lng: h.lng,
      title: `🏥 ${h.name}`,
      subtitle: `${h.address} • ER Dept: ${h.emergency_dept ? 'Active' : 'No'}`,
      icon: 'hospital',
    });
  });

  // Active Ambulance & Patient markers
  activeRequests.forEach(req => {
    markers.push({
      id: `pickup-${req.id}`,
      lat: req.pickup_lat,
      lng: req.pickup_lng,
      title: `📍 Patient: ${req.patient?.user?.full_name || 'Aarav Sharma'}`,
      subtitle: `Pickup: ${req.pickup_address}`,
      icon: 'patient',
    });

    if (req.driver && req.driver.current_lat != null && req.driver.current_lng != null) {
      markers.push({
        id: `amb-${req.id}`,
        lat: req.driver.current_lat,
        lng: req.driver.current_lng,
        title: `🚑 ${req.ambulance?.registration_number || 'AMB-104'} (${req.ambulance_type_requested})`,
        subtitle: `Driver: ${req.driver.user?.full_name || 'Raj Kumar'} • Status: ${req.status}`,
        icon: 'ambulance',
      });
    }
  });

  if (loading) return <div className="py-20 text-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-65px)] md:h-[calc(100vh-65px)] bg-gray-100 overflow-x-hidden md:overflow-hidden">
      
      {/* Sidebar Queue & Emergency Panel */}
      <div className="w-full md:w-96 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col z-10 shadow-lg max-h-[50vh] md:max-h-full">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
          <div>
            <h1 className="font-extrabold text-base flex items-center gap-2">
              <span>🏥</span> Jaipur Emergency Dispatch
            </h1>
            <p className="text-[11px] text-teal-400">Jaipur, Rajasthan • City Command Hub</p>
          </div>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800 rounded">
            Logout
          </button>
        </div>

        {/* Highlighted Critical Emergency Alert Banner */}
        {criticalRequest && (
          <div className="p-4 bg-red-50 border-b-2 border-red-500 animate-pulse">
            <div className="flex items-center justify-between mb-1">
              <span className="bg-red-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                🚨 ACTIVE CRITICAL EMERGENCY
              </span>
              <span className="text-xs font-black text-red-700 font-mono">
                ETA: ~{criticalRequest.estimated_eta || 4}m
              </span>
            </div>
            <h3 className="font-black text-sm text-gray-900 mt-1">
              {criticalRequest.patient?.user?.full_name || 'Aarav Sharma'}
            </h3>
            <p className="text-xs text-red-700 truncate mb-2">{criticalRequest.pickup_address}</p>
            <div className="bg-white p-2 rounded-lg border border-red-200 text-[11px] text-gray-700 flex justify-between">
              <span>Ambulance: <b>{criticalRequest.ambulance?.registration_number || 'AMB-104'}</b></span>
              <span>Driver: <b>{criticalRequest.driver?.user?.full_name || 'Raj Kumar'}</b></span>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Active Transports ({activeRequests.length})
            </h2>
            <button
              onClick={fetchData}
              className="text-[11px] text-teal-600 hover:underline font-bold"
            >
              ↻ Refresh
            </button>
          </div>

          {activeRequests.length === 0 && (
            <div className="text-center text-gray-400 py-12 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
              No active ambulance calls in Jaipur at this moment.
            </div>
          )}

          {activeRequests.map(req => (
            <div 
              key={req.id} 
              className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
                req.priority === 'CRITICAL' ? 'bg-red-50/40 border-red-300' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <PriorityBadge priority={req.priority} />
                <span className="text-xs font-extrabold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                  ~{req.estimated_eta || 5} min away
                </span>
              </div>

              <h4 className="font-bold text-gray-900 text-sm mb-0.5">
                {req.patient?.user?.full_name || 'Patient'}
              </h4>
              <p className="text-xs text-gray-500 truncate mb-3">📍 {req.pickup_address}</p>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs text-gray-600">
                <span className="font-mono font-bold text-teal-800">
                  {req.ambulance?.registration_number || 'AMB-104'} ({req.ambulance_type_requested})
                </span>
                <StatusBadge status={req.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Area Interactive Map */}
      <div className="flex-1 w-full min-w-0 relative h-[400px] sm:h-[480px] md:h-full min-h-[350px]">
        <InteractiveMap
          center={DEMO_CONFIG.defaultMapCenter}
          zoom={13}
          markers={markers}
          polyline={roadPolyline || undefined}
          height="100%"
        />
      </div>

    </div>
  );
}
