import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const DEMO_ACCOUNTS = [
  {
    email: 'aarav@demo.com',
    password: 'demo123',
    role: 'PATIENT',
    name: 'Aarav Sharma',
    buttonLabel: 'Open Patient Demo',
    description: 'Patient in Jaipur — Malviya Nagar home, clinical intake, documents & live ambulance dispatch',
    icon: '🧑‍⚕️',
    destination: '/patient',
    color: 'teal',
  },
  {
    email: 'raj.driver@demo.com',
    password: 'demo123',
    role: 'DRIVER',
    name: 'Raj Kumar',
    buttonLabel: 'Open Driver Demo',
    description: 'Ambulance driver — AMB-104 (ALS) stationed at JLN Marg near Aarav, live dispatch & trip progression',
    icon: '🚑',
    destination: '/driver',
    color: 'orange',
  },
  {
    email: 'staff@demo.com',
    password: 'demo123',
    role: 'STAFF',
    name: 'Hospital Command',
    buttonLabel: 'Open Hospital Demo',
    description: 'Jaipur hospital command center — live dispatcher map, SMS Hospital & Fortis ER incoming transports',
    icon: '🏥',
    destination: '/hospital',
    color: 'purple',
  },
  {
    email: 'sneha@demo.com',
    password: 'demo123',
    role: 'DOCTOR',
    name: 'Dr. Sneha Reddy',
    buttonLabel: 'Open Doctor Demo',
    description: 'Attending physician dashboard — triage queue, clinical summaries, documents & consultation chat',
    icon: '👩‍⚕️',
    destination: '/doctor',
    color: 'blue',
  },
  {
    email: 'admin@demo.com',
    password: 'demo123',
    role: 'ADMIN',
    name: 'System Admin',
    buttonLabel: 'Open Admin Demo',
    description: 'Admin platform console — healthcare analytics, system metrics, fleet status & audit trail',
    icon: '⚙️',
    destination: '/admin',
    color: 'gray',
  },
];

const colorMap: Record<string, string> = {
  teal: 'bg-teal-50/70 border-teal-200 hover:border-teal-400 hover:bg-teal-50',
  blue: 'bg-blue-50/70 border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  orange: 'bg-orange-50/70 border-orange-200 hover:border-orange-400 hover:bg-orange-50',
  purple: 'bg-purple-50/70 border-purple-200 hover:border-purple-400 hover:bg-purple-50',
  gray: 'bg-gray-50/70 border-gray-200 hover:border-gray-400 hover:bg-gray-50',
};

const iconBgMap: Record<string, string> = {
  teal: 'bg-teal-100 text-teal-700',
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-200 text-gray-700',
};

const btnColorMap: Record<string, string> = {
  teal: 'bg-teal-600 hover:bg-teal-700 text-white',
  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  orange: 'bg-orange-600 hover:bg-orange-700 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 text-white',
  gray: 'bg-gray-800 hover:bg-black text-white',
};

export function DemoSelector() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuickLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setLoadingEmail(account.email);
    setError(null);
    try {
      await login({ email: account.email, password: account.password });
      navigate(account.destination, { replace: true });
    } catch (err: any) {
      setError(`Login failed for ${account.name}. Make sure the backend is running.`);
      setLoadingEmail(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-gray-50 to-emerald-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">M</div>
            <span className="font-black text-gray-900 text-2xl tracking-tight">MediKiosk</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">Demo Account Launcher</h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto">
            Click any role below to automatically authenticate and jump directly into that role's live workspace.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Demo Account Cards */}
        <div className="grid gap-4">
          {DEMO_ACCOUNTS.map(account => (
            <div
              key={account.email}
              className={`border-2 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md cursor-pointer ${colorMap[account.color]}`}
              onClick={() => handleQuickLogin(account)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-sm ${iconBgMap[account.color]}`}>
                    {account.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">{account.name}</h3>
                      <span className="text-[10px] font-black tracking-wider uppercase bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shadow-2xs">
                        {account.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 sm:line-clamp-none">{account.description}</p>
                    <p className="text-xs text-gray-400 font-mono mt-1">{account.email} · demo123</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end sm:justify-center">
                  <button
                    type="button"
                    disabled={Boolean(loadingEmail)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickLogin(account);
                    }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all ${btnColorMap[account.color]}`}
                  >
                    {loadingEmail === account.email ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Launching...</span>
                      </>
                    ) : (
                      <>
                        <span>{account.buttonLabel}</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scenario guide */}
        <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💡 Suggested Demo Scenarios</h2>
          <div className="space-y-4 text-sm">
            <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
              <h4 className="font-bold text-teal-900 mb-1">Scenario 1 — AI Case-Taking & Triage (Jaipur)</h4>
              <ol className="list-decimal list-inside text-teal-800 space-y-1">
                <li>Login as <strong>Aarav Sharma (Patient)</strong> in Jaipur</li>
                <li>Click "Start Health History" and complete AI interview</li>
                <li>Upload medical reports (prescription / lab scan)</li>
                <li>In a new tab, login as <strong>Dr. Sneha</strong> to review the triage queue</li>
              </ol>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <h4 className="font-bold text-red-900 mb-1">Scenario 2 — Full Jaipur Emergency Dispatch (Hackathon Walkthrough)</h4>
              <ol className="list-decimal list-inside text-red-800 space-y-1">
                <li>Login as <strong>Aarav Sharma</strong> (Malviya Nagar, Jaipur)</li>
                <li>Open AI Interview or go directly to <strong>Ambulance</strong></li>
                <li>Verify pickup on Jaipur Map, select <strong>Fortis / SMS Hospital</strong></li>
                <li>Notice <strong>AMB-104 (ALS)</strong> matched as closest (~1.5 km, ~5m)</li>
                <li>Confirm request — switch to <strong>Raj Kumar (Driver)</strong> in another tab</li>
                <li>Driver receives real-time emergency alert, accepts dispatch</li>
                <li>Watch live tracking & trip simulation step-by-step to hospital</li>
              </ol>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Or{' '}
          <Link to="/register" className="text-teal-600 font-medium hover:underline">create your own account</Link>
          {' '}to try the full registration flow.
        </p>
      </div>
    </div>
  );
}
