import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ambulanceApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

export function DemoControlPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const showMsg = (txt: string) => {
    setMessage(txt);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleResetDemo = async () => {
    setLoading(true);
    try {
      await ambulanceApi.resetDemo();
      try {
        sessionStorage.clear();
      } catch {}
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('draft_') || k.startsWith('chat_') || k.startsWith('medikiosk_profile_draft') || k.startsWith('demo_'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
      showMsg('✅ Jaipur Demo environment reset successfully!');
      window.location.reload();
    } catch (err) {
      showMsg('❌ Failed to reset demo');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchUser = async (email: string, targetPath: string) => {
    setLoading(true);
    try {
      await login({ email, password: 'demo123' });
      navigate(targetPath);
      showMsg(`Switched to ${email}`);
    } catch (err) {
      showMsg('Failed to switch user');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateMovement = async () => {
    setLoading(true);
    try {
      const active = await ambulanceApi.getActive();
      if (active.length > 0) {
        const targetReq = active[0];
        const isEnRouteHosp = ['PATIENT_PICKED_UP', 'EN_ROUTE_HOSPITAL'].includes(targetReq.status);
        await ambulanceApi.simulateMovement(targetReq.id, isEnRouteHosp ? 'to_hospital' : 'to_patient');
        showMsg('🏎️ Ambulance GPS movement simulation started!');
      } else {
        showMsg('No active ambulance request found. Request one first.');
      }
    } catch (err) {
      showMsg('Failed to trigger simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 max-w-[calc(100vw-24px)]">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-950 hover:bg-black text-white font-extrabold text-xs px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full shadow-2xl border border-gray-700 flex items-center gap-2 transition-transform hover:scale-105 min-h-[40px]"
        >
          <span className="text-base">🎮</span> Jaipur Demo Control
        </button>
      ) : (
        <div className="bg-gray-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl border border-gray-800 w-80 max-w-[calc(100vw-24px)] animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-black text-sm flex items-center gap-2">
              <span>🎮</span> Jaipur Demo Control Panel
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-sm">
              ✕
            </button>
          </div>

          <p className="text-[11px] text-gray-400 mb-4">
            Quick developer & evaluator shortcuts to test Jaipur emergency workflows end-to-end.
          </p>

          {message && (
            <div className="p-2 mb-3 bg-teal-900/80 border border-teal-500 text-teal-200 text-xs rounded-xl text-center">
              {message}
            </div>
          )}

          <div className="space-y-2 mb-4">
            <button
              disabled={loading}
              onClick={handleResetDemo}
              className="w-full py-2 px-3 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>🔄</span> Reset Demo (Jaipur Defaults)
            </button>

            <button
              disabled={loading}
              onClick={handleSimulateMovement}
              className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>🏎️</span> Simulate Ambulance GPS Step
            </button>
          </div>

          <div className="pt-3 border-t border-gray-800">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Switch Demo Perspective</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
              <button
                onClick={() => handleSwitchUser('aarav@demo.com', '/patient/ambulance')}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-left truncate"
              >
                📍 Aarav (Patient)
              </button>
              <button
                onClick={() => handleSwitchUser('raj.driver@demo.com', '/driver')}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-left truncate"
              >
                🚑 Raj (Driver)
              </button>
              <button
                onClick={() => handleSwitchUser('sneha@demo.com', '/doctor/alerts')}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-left truncate"
              >
                👩‍⚕️ Dr. Sneha
              </button>
              <button
                onClick={() => handleSwitchUser('staff@demo.com', '/hospital')}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-left truncate"
              >
                🏥 Hospital Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
