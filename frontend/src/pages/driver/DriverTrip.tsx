import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ambulanceApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { InteractiveMap, MarkerData } from '../../components/map/InteractiveMap';
import { DEMO_CONFIG } from '../../config/demoConfig';
import { getDrivingRoute } from '../../services/routeService';

export function DriverTrip() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [driverLat, setDriverLat] = useState<number>(DEMO_CONFIG.driver.lat);
  const [driverLng, setDriverLng] = useState<number>(DEMO_CONFIG.driver.lng);
  const [roadPolyline, setRoadPolyline] = useState<[number, number][] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // WebSocket for trip coordinates and updates
  const { messages: wsMessages } = useWebSocket(id ? `ambulance_${id}` : null);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  useEffect(() => {
    if (wsMessages.length > 0) {
      const latest = wsMessages[wsMessages.length - 1];
      if (latest.type === 'location_update' && latest.data) {
        setDriverLat(latest.data.lat);
        setDriverLng(latest.data.lng);
      } else if (latest.type === 'ROUTE_READY' && latest.polyline && latest.polyline.length > 0) {
        setRoadPolyline(latest.polyline);
      } else if (latest.type === 'STATUS_UPDATED') {
        if (latest.request) {
          setRequest(latest.request);
          if (latest.request.route && latest.request.route.length > 0) {
            setRoadPolyline(latest.request.route);
          }
        } else if (id) {
          ambulanceApi.get(id).then(req => {
            setRequest(req);
            if ((req as any).route && (req as any).route.length > 0) {
              setRoadPolyline((req as any).route);
            }
          }).catch(() => undefined);
        }
      }
    }
  }, [wsMessages]);

  useEffect(() => {
    if (!request) return;
    if (request.route && request.route.length > 0) {
      setRoadPolyline(request.route);
    }
    const isHospitalLeg = ['PATIENT_PICKED_UP', 'EN_ROUTE_HOSPITAL', 'ARRIVED', 'COMPLETED'].includes(request.status);
    const sLat = isHospitalLeg ? request.pickup_lat : (request.driver?.current_lat || driverLat || DEMO_CONFIG.driver.lat);
    const sLng = isHospitalLeg ? request.pickup_lng : (request.driver?.current_lng || driverLng || DEMO_CONFIG.driver.lng);
    const eLat = isHospitalLeg ? request.destination_lat : request.pickup_lat;
    const eLng = isHospitalLeg ? request.destination_lng : request.pickup_lng;

    getDrivingRoute(sLat, sLng, eLat, eLng).then(r => {
      if (r && r.polyline && r.polyline.length > 0) {
        setRoadPolyline(r.polyline);
      }
    }).catch(() => {});
  }, [request?.id, request?.status]);

  const fetchRequest = async () => {
    try {
      const data = await ambulanceApi.get(id!);
      setRequest(data);
      if (data.driver && data.driver.current_lat != null && data.driver.current_lng != null) {
        setDriverLat(data.driver.current_lat);
        setDriverLng(data.driver.current_lng);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await ambulanceApi.updateStatus(id!, status);
      if (status === 'DRIVER_EN_ROUTE') {
        await ambulanceApi.simulateMovement(id!, 'to_patient');
      } else if (status === 'EN_ROUTE_HOSPITAL') {
        await ambulanceApi.simulateMovement(id!, 'to_hospital');
      }
      await fetchRequest();
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        navigate('/driver');
      }
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleSimulateMovement = async (leg: 'to_patient' | 'to_hospital') => {
    setIsSimulating(true);
    try {
      await ambulanceApi.simulateMovement(id!, leg);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsSimulating(false), 8000);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;
  if (!request) return <div className="p-8 text-center text-gray-500">Mission request not found.</div>;

  // Compute Next Action Button according to specification
  const getNextAction = () => {
    switch (request.status) {
      case 'MATCHED':
      case 'DRIVER_ASSIGNED':
        return {
          status: 'DRIVER_EN_ROUTE',
          label: 'Start Route to Patient (En Route)',
          color: 'bg-teal-600 hover:bg-teal-700',
          leg: 'to_patient' as const
        };
      case 'DRIVER_EN_ROUTE':
        return {
          status: 'ARRIVING',
          label: "I've Arrived at Pickup (Arrived)",
          color: 'bg-blue-600 hover:bg-blue-700',
          leg: 'to_patient' as const
        };
      case 'ARRIVING':
        return {
          status: 'PATIENT_PICKED_UP',
          label: 'Patient Picked Up (Boarded)',
          color: 'bg-indigo-600 hover:bg-indigo-700',
          leg: 'to_hospital' as const
        };
      case 'PATIENT_PICKED_UP':
        return {
          status: 'EN_ROUTE_HOSPITAL',
          label: 'Start Hospital Trip (En Route)',
          color: 'bg-teal-600 hover:bg-teal-700',
          leg: 'to_hospital' as const
        };
      case 'EN_ROUTE_HOSPITAL':
        return {
          status: 'ARRIVED',
          label: 'Arrived at Hospital (Emergency ER)',
          color: 'bg-purple-600 hover:bg-purple-700',
          leg: 'to_hospital' as const
        };
      case 'ARRIVED':
        return {
          status: 'COMPLETED',
          label: 'Complete Trip & Reset Availability',
          color: 'bg-green-600 hover:bg-green-700',
          leg: null
        };
      default:
        return null;
    }
  };

  const action = getNextAction();
  const isEnRouteToHospital = ['PATIENT_PICKED_UP', 'EN_ROUTE_HOSPITAL', 'ARRIVED'].includes(request.status);

  // Markers for Driver Interactive Map
  const markers: MarkerData[] = [
    {
      id: 'driver-ambulance',
      lat: driverLat,
      lng: driverLng,
      title: '🚑 AMB-104 (Your Ambulance)',
      subtitle: `${request.ambulance_type_requested} • Raj Kumar`,
      icon: 'ambulance',
    },
    {
      id: 'patient-pickup',
      lat: request.pickup_lat,
      lng: request.pickup_lng,
      title: `📍 Patient: ${request.patient?.user?.full_name || 'Aarav Sharma'}`,
      subtitle: request.pickup_address,
      icon: 'patient',
    },
    {
      id: 'destination-hospital',
      lat: request.destination_lat,
      lng: request.destination_lng,
      title: `🏥 Destination Hospital`,
      subtitle: request.destination_address,
      icon: 'hospital',
    }
  ];

  const polyline: [number, number][] | undefined = roadPolyline || (
    isEnRouteToHospital
      ? [[driverLat, driverLng], [request.destination_lat, request.destination_lng]]
      : [[driverLat, driverLng], [request.pickup_lat, request.pickup_lng]]
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col relative pb-36">
      
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 px-5 flex justify-between items-center z-10 shadow-md">
        <div>
          <Link to="/driver" className="text-gray-400 text-xs mb-0.5 block hover:text-white">← Driver Radar</Link>
          <h1 className="font-extrabold text-base">Active Mission • Jaipur</h1>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Patient Minimal Emergency Card */}
      <div className="p-4 bg-white shadow-sm z-10 relative border-b border-gray-100">
        <div className="flex justify-between items-start mb-2">
          <PriorityBadge priority={request.priority} />
          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700">REQ-{request.id.substring(0,6).toUpperCase()}</span>
        </div>
        
        <h2 className="text-lg font-black text-gray-900 leading-snug">{request.patient?.user?.full_name || 'Aarav Sharma'}</h2>
        <p className="text-xs text-gray-500 mb-3">
          Blood Group: <b>{request.patient?.blood_group || 'O+'}</b> • Critical Red-Flag Emergency Detected
        </p>

        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2 text-xs">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Current Destination</p>
            <p className="font-bold text-gray-900">
              {isEnRouteToHospital ? `🏥 ${request.destination_address}` : `📍 ${request.pickup_address}`}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Navigation Map */}
      <div className="w-full min-w-0 h-[380px] sm:h-[450px] md:h-[500px] min-h-[350px] relative">
        <InteractiveMap
          center={[driverLat, driverLng]}
          zoom={14}
          markers={markers}
          polyline={polyline}
          height="100%"
        />

        {/* Floating Quick Simulation Button */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => handleSimulateMovement(isEnRouteToHospital ? 'to_hospital' : 'to_patient')}
            disabled={isSimulating}
            className="bg-gray-950/90 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg border border-gray-700 backdrop-blur-sm flex items-center gap-1.5"
          >
            <span>🏎️</span>
            {isSimulating ? 'Simulating GPS Move...' : 'Simulate GPS Movement'}
          </button>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md p-4 border-t border-gray-200 z-20 space-y-2 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        {action && (
          <Button 
            className={`w-full py-4 text-base font-extrabold text-white shadow-lg ${action.color}`}
            onClick={() => handleUpdateStatus(action.status)}
            loading={updating}
          >
            {action.label} →
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={`tel:${request.patient?.user?.phone || '+919829055555'}`}
            className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
          >
            <span>📞</span> Call Patient
          </a>
          <Button
            variant="outline"
            className="text-xs text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => handleUpdateStatus('CANCELLED')}
          >
            Abort / Cancel Mission
          </Button>
        </div>
      </div>

    </div>
  );
}
