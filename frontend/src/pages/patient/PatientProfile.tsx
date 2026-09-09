import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { patientApi } from '../../api/client';
import { Card, CardBody } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { ConsultationChat } from '../../components/shared/ConsultationChat';
import { useTranslation } from '../../hooks/useTranslation';

// Error boundary for bulletproof profile resilience
class ProfileErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("PatientProfile rendering caught error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-2">Profile Notice</h3>
            <p className="text-sm text-amber-700 mb-4">Some optional records could not be loaded, but your core patient information is preserved.</p>
            <Link to="/patient" className="text-xs font-bold text-teal-700 underline">← Return to Patient Home</Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">{t(label)}</p>
      <p className="text-sm font-semibold text-gray-800 break-words">{value || t('Not recorded')}</p>
    </div>
  );
}

export function PatientProfile() {
  return (
    <ProfileErrorBoundary>
      <PatientProfileContent />
    </ProfileErrorBoundary>
  );
}

function PatientProfileContent() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const patient = await patientApi.getByUserId(user.id);
        setProfile(await patientApi.getProfile(patient.id));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const latest = profile?.consultations?.[0]?.history;
  const activeMeds = useMemo(() => (profile?.medications || []).filter((m: any) => m?.is_active), [profile]);

  if (loading) return <div className="py-20 text-center"><LoadingSpinner size="lg" /></div>;
  if (!profile) return <div className="py-20 text-center text-gray-500">Unable to load your patient profile.</div>;

  const p = profile.patient || {};
  
  // Calculate age internally from date_of_birth if direct age is not set
  const computedAge = p.age || (p.date_of_birth ? (() => {
    const dob = new Date(p.date_of_birth);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  })() : null);

  const parsedAyurvedic = typeof latest?.ayurvedic_history === 'string'
    ? (() => { try { return JSON.parse(latest.ayurvedic_history); } catch { return {}; } })()
    : (latest?.ayurvedic_history || {});

  const redFlagsList = Array.isArray(latest?.red_flags)
    ? latest.red_flags
    : (typeof latest?.red_flags === 'string' ? (() => { try { return JSON.parse(latest.red_flags); } catch { return []; } })() : []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link to="/patient" className="text-sm text-teal-700 font-semibold">← {t('patient.home_link', 'Patient Home')}</Link>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">{t('profile.title', 'Patient Health Profile')}</h1>
          <p className="text-xs sm:text-sm text-gray-500">{t('profile.subtitle', 'Information collected from your profile, interview and medical records.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/patient/interview"><Button className="text-xs min-h-[38px]">{t('profile.update_survey', 'Update health survey')}</Button></Link>
          <span className="px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold self-center">📍 Jaipur</span>
        </div>
      </div>

      <Card>
        <CardBody>
          <h2 className="text-lg font-bold mb-4">{t('profile.personal_info', 'Personal Information')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Full name" value={p.user?.full_name || 'Not provided'} />
            <Field label="Date of birth" value={p.date_of_birth || 'Not recorded'} />
            <Field label="Gender" value={p.gender || 'Not recorded'} />
            <Field label="Blood group" value={p.blood_group || 'Not recorded'} />
            <Field label="Phone" value={p.user?.phone || 'Not provided'} />
            <Field label="Email" value={p.user?.email || 'Not provided'} />
            <Field label="Preferred language" value={p.preferred_language === 'hi' ? 'Hindi (हिन्दी)' : p.preferred_language === 'en' ? 'English' : (p.preferred_language || 'Not recorded')} />
            <Field label="ABHA ID" value={p.abha_id || 'Not recorded'} />
            <Field label="Address" value={p.address || 'Not recorded'} />
            <Field label="Emergency contact" value={p.emergency_contact_name || 'Not recorded'} />
            <Field label="Emergency phone" value={p.emergency_contact_phone || 'Not recorded'} />
          </div>
        </CardBody>
      </Card>

      {p.medical_history && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold">{t('profile.medical_history_title', 'Medical History (15 Questions)')}</h2>
                <p className="text-xs text-gray-500">{t('profile.medical_history_subtitle', 'Clinical background captured during patient onboarding.')}</p>
              </div>
              <Link to="/patient/medical-history"><Button variant="outline" className="text-xs">{t('common.review_update', 'Review / Update')}</Button></Link>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                ['Chronic conditions', 'chronic_conditions'],
                ['Previous hospitalizations', 'previous_hospitalizations'],
                ['Surgeries / procedures', 'surgeries'],
                ['Allergies', 'allergies'],
                ['Serious allergic reactions', 'serious_allergic_reaction'],
                ['Current medicines', 'current_medications'],
                ['Supplements / Ayurvedic', 'supplements_ayurvedic'],
                ['Previous diagnoses', 'previous_diagnoses'],
                ['Family history', 'family_history'],
                ['Major injuries / fractures', 'major_injuries'],
                ['Blood transfusion history', 'blood_history'],
                ['Ongoing undiagnosed concerns', 'ongoing_undiagnosed_concerns'],
                ['Recent doctor visits', 'recent_doctor_visits'],
                ['Previous treatments / therapies', 'previous_treatments'],
                ['Additional health history', 'additional_history']
              ].map(([label, key]) => (
                <Field key={key} label={label} value={p.medical_history[key]} />
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h2 className="text-lg font-bold mb-4">{t('profile.clinical_history_title', 'Clinical History from AI Interview')}</h2>
            <div className="space-y-3">
              <Field label="Chief complaint" value={latest?.chief_complaint} />
              <Field label="History of present illness" value={latest?.hpi} />
              <Field label="Current symptoms" value={latest?.current_symptoms} />
              <Field label="Past medical history" value={latest?.past_medical} />
              <Field label="Past surgical history" value={latest?.past_surgical} />
              <Field label="Medicines" value={latest?.drug_history} />
              <Field label="Allergies" value={latest?.allergy_history} />
              <Field label="Family history" value={latest?.family_history} />
              <Field label="Personal / lifestyle history" value={latest?.personal_history} />
              <Field label="Review of systems" value={latest?.review_of_systems} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-lg font-bold mb-4">{t('profile.ayurvedic_title', 'Ayurvedic & Lifestyle Profile')}</h2>
            <div className="space-y-3">
              <Field label="Prakriti" value={parsedAyurvedic.prakriti} />
              <Field label="Agni" value={parsedAyurvedic.agni} />
              <Field label="Koshta" value={parsedAyurvedic.koshta} />
              <Field label="Diet" value={parsedAyurvedic.diet} />
              <Field label="Sleep" value={parsedAyurvedic.sleep_pattern} />
              <Field label="Lifestyle" value={parsedAyurvedic.lifestyle} />
              {redFlagsList.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">{t('profile.red_flags_recorded', '🚨 Red flags recorded')}</p>
                  <p className="text-sm text-red-800">{redFlagsList.map((f: any) => f.keyword || f).join(', ')}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardBody>
            <h2 className="font-bold mb-3">{t('profile.active_meds', 'Current Medicines')}</h2>
            {activeMeds.length ? activeMeds.map((m: any) => (
              <div key={m.id} className="border-b last:border-0 py-2">
                <p className="font-semibold text-sm">{m.name}</p>
                <p className="text-xs text-gray-500">{m.dosage || ''} {m.frequency || ''}</p>
              </div>
            )) : <p className="text-sm text-gray-500">{t('profile.no_medicines', 'No medicines recorded.')}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-bold mb-3">{t('profile.allergies', 'Allergies')}</h2>
            {profile.allergies?.length ? profile.allergies.map((a: any) => (
              <div key={a.id} className="border-b last:border-0 py-2">
                <p className="font-semibold text-sm">{a.allergen}</p>
                <p className="text-xs text-gray-500">{a.reaction || 'Reaction not recorded'} • {a.severity || 'Unknown severity'}</p>
              </div>
            )) : <p className="text-sm text-gray-500">{t('profile.no_allergies', 'No allergies recorded.')}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-bold mb-3">{t('docs.title', 'Medical Documents')}</h2>
            {profile.documents?.length ? profile.documents.slice(0, 5).map((d: any) => (
              <div key={d.id} className="border-b last:border-0 py-2">
                <p className="font-semibold text-sm">📄 {d.file_name}</p>
                <p className="text-xs text-gray-500">{d.document_type} • {d.ocr_status}</p>
              </div>
            )) : <p className="text-sm text-gray-500">{t('docs.no_docs', 'No documents uploaded yet.')}</p>}
            <Link to="/patient/documents"><Button variant="outline" className="w-full mt-3 text-xs">{t('docs.manage_docs', 'Manage Documents')}</Button></Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('profile.consultations', 'Consultation History')}</h2>
              <p className="text-xs text-gray-500">{t('profile.consultations_subtitle', 'Connected clinical intake encounters & AI case-taking sessions')}</p>
            </div>
            <Link to="/patient/interview">
              <Button size="sm" variant="outline">
                {t('profile.new_intake', '+ New Intake')}
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {profile.consultations && profile.consultations.length > 0 ? (
              profile.consultations.map((c: any) => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  READY: { label: 'Ready for Doctor Review', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                  AI_INTERVIEW: { label: 'AI Clinical Interview (Active)', color: 'bg-teal-100 text-teal-800 border-teal-200' },
                  WAITING: { label: 'Waiting in Queue', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                  EMERGENCY: { label: 'Critical Emergency Triage', color: 'bg-red-100 text-red-800 border-red-200' },
                  PROCESSING: { label: 'Clinical Processing', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                  COMPLETED: { label: 'Consultation Completed', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                };
                const st = statusMap[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-700 border-gray-200' };

                return (
                  <div key={c.id} className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 hover:border-teal-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">AI Clinical Interview</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'} • {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>

                      <Link to="/patient/interview">
                        <Button size="sm" variant="outline" className="text-xs font-bold">
                          View Consultation →
                        </Button>
                      </Link>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-200/60">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Chief Complaint</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">
                        {c.chief_complaint || 'General Clinical Intake'}
                      </p>
                      {c.history?.hpi && (
                        <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 bg-white p-2 rounded-lg border border-gray-100">
                          {c.history.hpi}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400 italic py-4 text-center">No consultation history recorded yet.</p>
            )}
          </div>
        </CardBody>
      </Card>

      {profile.consultations?.[0]?.id && (
        <ConsultationChat consultationId={profile.consultations[0].id} />
      )}
    </div>
  );
}
