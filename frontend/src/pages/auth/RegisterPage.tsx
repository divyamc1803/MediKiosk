import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardBody } from '../../components/ui/Card';
import { Role } from '../../types';

const passwordRules = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '', password: '', full_name: '', role: 'PATIENT' as Role, phone: ''
  });
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordRules.every(rule => rule.test(formData.password))) {
      return;
    }
    try {
      const user = await register(formData);
      if (user.role === 'PATIENT') navigate('/patient/profile-setup', { replace: true });
      else if (user.role === 'DOCTOR') navigate('/doctor', { replace: true });
      else if (user.role === 'DRIVER') navigate('/driver', { replace: true });
      else if (user.role === 'STAFF') navigate('/hospital', { replace: true });
      else if (user.role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    } catch {
      // Error is handled by the auth context.
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">M</div>
          <span className="font-bold text-gray-900 text-2xl tracking-tight">MediKiosk</span>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
        <p className="text-center text-sm text-gray-500 mt-2">After registration, patients complete their health profile separately.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardBody>
            <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

              <Input label="Full Name" name="full_name" required value={formData.full_name} onChange={handleChange} />
              <Input label="Email" type="email" name="email" required autoComplete="off" id="registration-email" placeholder="you@example.com" spellCheck={false} data-lpignore="true" data-1p-ignore="true" data-form-type="other" value={formData.email} onChange={handleChange} />
              <Input label="Password" type="password" name="password" required minLength={8} autoComplete="new-password" value={formData.password} onChange={handleChange} />
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-bold text-gray-700 mb-2">Password requirements</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {passwordRules.map(rule => {
                    const valid = rule.test(formData.password);
                    return <div key={rule.key} className={`text-xs flex items-center gap-2 ${valid ? 'text-emerald-700' : 'text-gray-500'}`}>
                      <span className={`inline-flex w-4 h-4 items-center justify-center rounded-full text-[10px] ${valid ? 'bg-emerald-100' : 'bg-gray-200'}`}>{valid ? '✓' : '•'}</span>
                      {rule.label}
                    </div>;
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5">
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                </select>
              </div>

              <Input label="Phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} />

              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-900">
                <b>Next step for patients:</b> you will be taken directly to Patient Profile Setup, where DOB, emergency contact, optional ABHA ID, medical history and consent are completed.
              </div>

              <Button type="submit" className="w-full mt-6" size="lg" loading={loading} disabled={!passwordRules.every(rule => rule.test(formData.password))}>Register</Button>
            </form>
          </CardBody>
        </Card>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-500">Sign in</Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-600">
          Want the demonstration? <Link to="/demo" className="font-medium text-emerald-600 hover:text-emerald-500">Open Demo Mode</Link>
        </p>
      </div>
    </div>
  );
}
