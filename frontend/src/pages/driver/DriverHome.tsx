import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ambulanceApi } from '../../api/client';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PriorityBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { AmbulanceRequest } from '../../types';

export function DriverHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // WebSocket for real-time incoming emergency alerts
  const { messages: wsMessages } = useWebSocket('driver_requests');

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wsMessages.length > 0) {
      const latest = wsMessages[wsMessages.length - 1];
      if (latest.type === 'AMBULANCE_REQUEST_CREATED' && latest.request) {
        setRequests(prev => {
          const exists = prev.some(r => r.id === latest.request.id);
          if (exists) return prev.map(r => r.id === latest.request.id ? latest.request : r);
          return [latest.request, ...prev];
        });
      }
    }
  }, [wsMessages]);

  const fetchRequests = async () => {
    try {
      const data = await ambulanceApi.getDriverRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeTrip = requests.find(r => !['COMPLETED', 'CANCELLED', 'MATCHED', 'SEARCHING'].includes(r.status));
  const newRequests = requests.filter(r => ['MATCHED', 'SEARCHING'].includes(r.status));

  const handleAccept = async (id: string) => {
    try {
      await ambulanceApi.accept(id);
      navigate(`/driver/trip/${id}`);
    } catch (err) {
      alert("Failed to accept request");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await ambulanceApi.updateStatus(id, 'CANCELLED');
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-gray-900 text-white p-6 pb-8 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center font-bold text-sm text-white">🚑</div>
            <div>
              <span className="font-bold text-base block leading-tight">{user?.full_name || 'Raj Kumar'}</span>
              <span className="text-[11px] text-teal-400 font-mono">AMB-104 (ALS) • Jaipur</span>
            </div>
          </div>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-white px-2.5 py-1 bg-gray-800 rounded-lg">Logout</button>
        </div>
        
        <div className="flex justify-between items-center bg-gray-800 p-1.5 rounded-full border border-gray-700">
          <button 
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${!isOnline ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400'}`}
            onClick={() => setIsOnline(false)}
          >
            OFFLINE
          </button>
          <button 
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${isOnline ? 'bg-teal-500 text-white shadow-sm' : 'text-gray-400'}`}
            onClick={() => setIsOnline(true)}
          >
            ONLINE (RECEIVING DISPATCH)
          </button>
        </div>
      </div>

      <div className="p-4 -mt-3 relative z-10 flex-1 space-y-4">
        
        {/* Ongoing Active Trip */}
        {activeTrip && (
          <div className="mb-4">
            <h2 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>🚨</span> Current Active Mission
            </h2>
            <Card className="border-teal-300 shadow-lg bg-teal-50/50">
              <CardBody>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-gray-900 text-base">{activeTrip.patient?.user?.full_name || 'Patient'}</span>
                    <p className="text-xs text-gray-600 truncate">{activeTrip.pickup_address}</p>
                  </div>
                  <PriorityBadge priority={activeTrip.priority} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4 bg-white p-2.5 rounded-xl border border-teal-100">
                  <span>Status: <b className="text-teal-700">{activeTrip.status}</b></span>
                  <span>ETA: <b>~{activeTrip.estimated_eta || 4} min</b></span>
                </div>
                <Link to={`/driver/trip/${activeTrip.id}`}>
                  <Button className="w-full shadow-md shadow-teal-600/20">Resume Mission Navigation →</Button>
                </Link>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Incoming Emergency Requests */}
        {isOnline && newRequests.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              🚨 NEW EMERGENCY REQUEST ({newRequests.length})
            </h2>
            
            <div className="space-y-4">
              {newRequests.map(req => (
                <div 
                  key={req.id} 
                  className="p-5 rounded-2xl border-2 border-red-500 bg-red-50/60 shadow-xl animate-in slide-in-from-bottom-3"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="bg-red-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full shadow-sm">
                        {req.priority || 'CRITICAL'} DISPATCH
                      </span>
                      <h3 className="font-black text-xl text-gray-900 mt-2">{req.patient?.user?.full_name || 'Aarav Sharma'}</h3>
                      <p className="text-xs text-red-700 font-medium">Potential emergency detected • Immediate transport required</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-red-800 bg-white border border-red-200 px-2.5 py-1 rounded-xl shadow-sm block">
                        ~{req.estimated_eta || 5} min away
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono mt-0.5 block">{req.distance_km || 1.8} km</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-5 bg-white p-3.5 rounded-xl border border-red-100 shadow-sm text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-base text-blue-600">📍</span>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Pickup Location (Jaipur)</p>
                        <p className="font-bold text-gray-900 line-clamp-1">{req.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                      <span className="text-base text-red-600">🏥</span>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Destination Hospital</p>
                        <p className="font-bold text-gray-900 line-clamp-1">{req.destination_address || 'Jaipur Emergency Hospital'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="w-full bg-white border-gray-300 text-gray-700 text-xs py-3"
                      onClick={() => handleDecline(req.id)}
                    >
                      Decline
                    </Button>
                    <Button 
                      className="w-full text-white font-extrabold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 text-sm py-3"
                      onClick={() => handleAccept(req.id)}
                    >
                      ACCEPT DISPATCH 🚑
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Online Waiting State */}
        {!activeTrip && isOnline && newRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-4xl mb-4 relative">
              🚑
              <div className="absolute inset-0 border-4 border-teal-300 rounded-full animate-ping opacity-40"></div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Waiting for Requests...</h2>
            <p className="text-xs text-gray-500 max-w-xs mb-4">
              You are assigned to <b>AMB-104 (ALS)</b> in <b>Malviya Nagar / JLN Marg, Jaipur</b>. New emergency dispatches will appear here automatically.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Dispatch Radar Active
            </div>
          </div>
        )}

        {/* Offline State */}
        {!isOnline && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-200 p-6 opacity-60">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4">
              😴
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">You're Offline</h2>
            <p className="text-xs text-gray-500">Toggle online to start receiving Jaipur emergency trips.</p>
          </div>
        )}

      </div>
    </div>
  );
}
