import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { patientApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';

export function ProfileSetup() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [historyComplete, setHistoryComplete] = useState(false);
  const [form, setForm] = useState<any>({ preferred_language: 'hi', ambulance_consent: false, medical_care_consent: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const DRAFT_KEY = user ? `medikiosk_profile_draft_${user.id}` : '';

  useEffect(() => {
    if (!user) return;
    patientApi.getByUserId(user.id).then(async p => {
      setPatient(p);
      let draft: any = {};
      try { draft = JSON.parse(sessionStorage.getItem(`medikiosk_profile_draft_${user.id}`) || '{}'); } catch {}
      setForm((prev: any) => ({ ...prev, ...p, ...draft, ambulance_consent: draft.ambulance_consent ?? prev.ambulance_consent ?? false, medical_care_consent: draft.medical_care_consent ?? prev.medical_care_consent ?? false }));
      const h = await patientApi.getMedicalHistory(p.id);
      setHistoryComplete(Boolean(h.completed));
    }).catch(e => setError(e.response?.data?.detail || 'Unable to load your profile.'));
  }, [user]);

  const set = (key: string, value: any) => {
    setForm((prev: any) => {
      const next = { ...prev, [key]: value };
      if (DRAFT_KEY) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  };
  const profileFieldsValid = Boolean(form.date_of_birth && form.emergency_contact_name?.trim() && form.emergency_contact_phone?.trim() && form.preferred_language);
  const canSubmit = Boolean(patient && profileFieldsValid && historyComplete && form.ambulance_consent && form.medical_care_consent);

  const openMedicalHistory = () => {
    if (DRAFT_KEY) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    nav('/patient/medical-history');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!historyComplete) { setError('Medical History is compulsory. Please complete it before continuing.'); return; }
    if (!profileFieldsValid) { setError('Please complete your Date of Birth and emergency contact details.'); return; }
    if (!form.ambulance_consent || !form.medical_care_consent) { setError('Please check both consent boxes before continuing.'); return; }
    setSaving(true);
    try {
      const result = await patientApi.onboarding(patient.id, {
        date_of_birth: form.date_of_birth,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        preferred_language: form.preferred_language,
        abha_id: form.abha_id?.trim() || null,
        address: form.address || null,
        emergency_contact_name: form.emergency_contact_name.trim(),
        emergency_contact_phone: form.emergency_contact_phone.trim(),
        ambulance_consent: true,
        medical_care_consent: true
      });
      if (result?.status !== 'complete') throw new Error('Profile was not confirmed by the server.');
      if (DRAFT_KEY) sessionStorage.removeItem(DRAFT_KEY);
      nav('/patient/welcome', { replace: true });
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : detail?.message || e.message || 'Could not save your profile.');
    } finally { setSaving(false); }
  };

  return <div className="max-w-3xl mx-auto py-4 sm:py-8">
    <Card><CardBody>
      <p className="text-xs font-bold text-emerald-700">PATIENT ONBOARDING</p>
      <h1 className="text-2xl sm:text-3xl font-black mt-1">Complete your health profile</h1>
      <p className="text-sm text-gray-500 mt-2 mb-6">Complete the required details below. ABHA ID is optional. Your information is saved as a draft while you complete Medical History.</p>
      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <label><span className="text-xs font-bold text-gray-600">Date of birth *</span><input required value={form.date_of_birth || ''} type="date" onChange={e => set('date_of_birth', e.target.value)} className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /></label>
        <label><span className="text-xs font-bold text-gray-600">Gender</span><select value={form.gender || ''} onChange={e => set('gender', e.target.value)} className="mt-1 w-full rounded-xl bg-gray-50 border-gray-200 px-3 py-3"><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></label>
        <label><span className="text-xs font-bold text-gray-600">ABHA ID (Optional)</span><input value={form.abha_id || ''} onChange={e => set('abha_id', e.target.value)} placeholder="Enter if you have an ABHA ID" className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /></label>
        <label><span className="text-xs font-bold text-gray-600">Blood group</span><input value={form.blood_group || ''} onChange={e => set('blood_group', e.target.value)} placeholder="e.g. O+" className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /></label>
        <label><span className="text-xs font-bold text-gray-600">Emergency contact name *</span><input required value={form.emergency_contact_name || ''} onChange={e => set('emergency_contact_name', e.target.value)} className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /></label>
        <label><span className="text-xs font-bold text-gray-600">Emergency contact phone *</span><input required type="tel" value={form.emergency_contact_phone || ''} onChange={e => set('emergency_contact_phone', e.target.value)} className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /></label>
        <label className="sm:col-span-2"><span className="text-xs font-bold text-gray-600">Address</span><input value={form.address || ''} onChange={e => set('address', e.target.value)} className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /></label>
        <label><span className="text-xs font-bold text-gray-600">Preferred language *</span><select value={form.preferred_language || 'hi'} onChange={e => set('preferred_language', e.target.value)} className="mt-1 w-full rounded-xl bg-gray-50 border-gray-200 px-3 py-3"><option value="hi">हिन्दी</option><option value="en">English</option><option value="mr">मराठी</option><option value="bn">বাংলা</option><option value="ta">தமிழ்</option><option value="te">తెలుగు</option><option value="gu">ગુજરાતી</option><option value="kn">ಕನ್ನಡ</option><option value="ml">മലയാളം</option><option value="pa">ਪੰਜਾਬੀ</option></select></label>

        <div className="sm:col-span-2">
          <button type="button" onClick={openMedicalHistory} className={`w-full text-left rounded-2xl border-2 p-4 transition ${historyComplete ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'}`}>
            <div className="flex items-center justify-between gap-3"><div><p className="font-black text-gray-900">🩺 Medical History <span className="text-red-500">*</span></p><p className="text-xs text-gray-600 mt-1">{historyComplete ? 'Completed — tap to review or update.' : 'Compulsory — complete the medical-history questionnaire.'}</p></div><span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black ${historyComplete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>{historyComplete ? '✓ Completed' : 'Required →'}</span></div>
          </button>
        </div>

        <div className="sm:col-span-2 space-y-3">
          <label className="flex gap-3 p-4 rounded-2xl border bg-emerald-50"><input type="checkbox" checked={!!form.ambulance_consent} onChange={e => set('ambulance_consent', e.target.checked)} className="mt-1 accent-emerald-600" /><span className="text-sm text-gray-700"><b>I agree to receive ambulance assistance</b> when I request emergency transport, subject to availability and emergency protocols.</span></label>
          <label className="flex gap-3 p-4 rounded-2xl border bg-emerald-50"><input type="checkbox" checked={!!form.medical_care_consent} onChange={e => set('medical_care_consent', e.target.checked)} className="mt-1 accent-emerald-600" /><span className="text-sm text-gray-700"><b>I agree to receive medical care</b> from the appropriate clinician/care team after assessment. This is informed consent, not a waiver of patient rights.</span></label>
        </div>

        <div className="sm:col-span-2"><Button type="submit" disabled={!canSubmit} loading={saving} className="w-full" size="lg">{canSubmit ? 'Save profile & continue →' : 'Complete the required steps to continue'}</Button></div>
      </form>
    </CardBody></Card>
  </div>;
}
