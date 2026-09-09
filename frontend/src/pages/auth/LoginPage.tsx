import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardBody } from '../../components/ui/Card';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login({ email: email.trim().toLowerCase(), password: password.trim() });
      
      switch(user.role) {
        case 'PATIENT': navigate('/patient'); break;
        case 'DOCTOR': navigate('/doctor'); break;
        case 'DRIVER': navigate('/driver'); break;
        case 'STAFF': navigate('/hospital'); break;
        case 'ADMIN': navigate('/admin'); break;
        default: navigate('/', { replace: true });
      }
    } catch (err) {
      // Error is handled by context
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    try {
      const user = await login({ email: demoEmail, password: 'demo123' });
      switch(user.role) {
        case 'PATIENT': navigate('/patient'); break;
        case 'DOCTOR': navigate('/doctor'); break;
        case 'DRIVER': navigate('/driver'); break;
        case 'STAFF': navigate('/hospital'); break;
        case 'ADMIN': navigate('/admin'); break;
        default: navigate('/', { replace: true });
      }
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">M</div>
          <span className="font-bold text-gray-900 text-2xl tracking-tight">MediKiosk</span>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        <p className="mt-2 text-center text-xs text-gray-500">
          Enter credentials or click any demo profile below for instant access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardBody>
            <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <Input 
                label="Email address" 
                type="email" 
                required
                autoComplete="off"
                name="login_email"
                id="login-email"
                placeholder="sneha@demo.com"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input 
                label="Password" 
                type="password" 
                required
                autoComplete="off"
                name="login_password"
                id="login-password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Sign in
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center mb-3">
                1-Click Demo Logins (Password: demo123)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('sneha@demo.com', 'DOCTOR')}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-colors text-xs font-semibold text-blue-900 disabled:opacity-50"
                >
                  <span className="text-base">👩‍⚕️</span>
                  <div>
                    <div className="font-bold">Dr. Sneha</div>
                    <div className="text-[10px] text-blue-700 font-normal">Doctor View</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('aarav@demo.com', 'PATIENT')}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-colors text-xs font-semibold text-teal-900 disabled:opacity-50"
                >
                  <span className="text-base">🧑‍⚕️</span>
                  <div>
                    <div className="font-bold">Aarav Sharma</div>
                    <div className="text-[10px] text-teal-700 font-normal">Patient View</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('raj.driver@demo.com', 'DRIVER')}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-orange-200 bg-orange-50/60 hover:bg-orange-100/70 text-left transition-colors text-xs font-semibold text-orange-900 disabled:opacity-50"
                >
                  <span className="text-base">🚑</span>
                  <div>
                    <div className="font-bold">Raj Kumar</div>
                    <div className="text-[10px] text-orange-700 font-normal">Ambulance Driver</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('staff@demo.com', 'STAFF')}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-left transition-colors text-xs font-semibold text-purple-900 disabled:opacity-50"
                >
                  <span className="text-base">🏥</span>
                  <div>
                    <div className="font-bold">Command Center</div>
                    <div className="text-[10px] text-purple-700 font-normal">Hospital Staff</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <Link to="/demo" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors">
                <span>⚡</span>
                <span>Open Complete Demo Hub & Interactive Guide →</span>
              </Link>
            </div>
          </CardBody>
        </Card>
        
        <p className="mt-4 text-center text-xs text-gray-500">
          Demo environment with pre-seeded Jaipur health records & ambulances
        </p>
      </div>
    </div>
  );
}
