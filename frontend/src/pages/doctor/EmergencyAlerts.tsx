import React, { useState, useEffect } from 'react';
import { doctorApi, ambulanceApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { InteractiveMap, MarkerData } from '../../components/map/InteractiveMap';
import { DEMO_CONFIG } from '../../config/demoConfig';
import type { EmergencyAlert, AmbulanceRequest } from '../../types';

export function EmergencyAlerts() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [activeAmbulances, setActiveAmbulances] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [alertList, ambList] = await Promise.all([
        doctorApi.getAlerts().catch(() => []),
        ambulanceApi.getActive().catch(() => [])
      ]);
      setAlerts(alertList);
      setActiveAmbulances(ambList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await doctorApi.acknowledgeAlert(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const markers: MarkerData[] = [];
  activeAmbulances.forEach(req => {
    markers.push({
      id: `pat-${req.id}`,
      lat: req.pickup_lat,
      lng: req.pickup_lng,
      title: `📍 Emergency: ${req.patient?.user?.full_name || 'Patient'}`,
      subtitle: req.pickup_address,
      icon: 'patient'
    });
    if (req.driver && req.driver.current_lat != null && req.driver.current_lng != null) {
      markers.push({
        id: `amb-${req.id}`,
        lat: req.driver.current_lat,
        lng: req.driver.current_lng,
        title: `🚑 ${req.ambulance?.registration_number || 'AMB-104'}`,
        subtitle: `Driver: ${req.driver.user?.full_name || 'Raj Kumar'}`,
        icon: 'ambulance'
      });
    }
  });

  if (loading) return <div className="py-20 text-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>🚨</span> Jaipur Emergency & Red-Flag Triage
          </h1>
          <p className="text-gray-500 text-sm">Real-time alerts detected by AI clinical history and live ambulance missions.</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">↻ Refresh</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alerts List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-600">Active Medical Red Flags</h2>
          {alerts.length === 0 && (
            <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-sm">
              No unacknowledged red-flag emergencies right now.
            </div>
          )}
          {alerts.map(a => (
            <div key={a.id} className="p-5 bg-red-50 border-2 border-red-300 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-red-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                  {a.priority || 'CRITICAL'}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {new Date(a.created_at).toLocaleTimeString()}
                </span>
              </div>
              <h3 className="font-black text-gray-900 text-base mb-1">
                {a.patient?.user?.full_name || 'Patient Emergency'}
              </h3>
              <p className="text-xs text-red-700 font-semibold mb-3">
                Detected Red Flags: {a.red_flags?.map(r => r.keyword).join(', ') || 'Severe chest pain / breathing difficulty'}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-red-200">
                <span className="text-xs text-gray-600 font-medium">Potential emergency detected based on reported symptoms.</span>
                <Button size="sm" variant="outline" className="bg-white border-red-300 text-red-700" onClick={() => handleAcknowledge(a.id)}>
                  Acknowledge
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Live Map of Emergency Transports */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
            <span>🚑</span> Active Jaipur Ambulance Dispatch Map
          </h2>
          <div className="w-full min-w-0 h-[380px] sm:h-[460px] md:h-[520px] min-h-[350px] rounded-xl overflow-hidden border border-gray-200 relative">
            <InteractiveMap
              center={DEMO_CONFIG.defaultMapCenter}
              zoom={13}
              markers={markers}
              height="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
