import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { patientApi } from '../../api/client';
import type { Patient, Consultation } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { HomeButton } from '../../components/shared/HomeButton';

export function PatientHome() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboard = async () => {
      try {
        const pat = await patientApi.getByUserId(user.id).catch(() => null);
        if (pat) {
          setPatient(pat);
          if (pat?.id) patientApi.getFollowUps(pat.id).then(setFollowUps).catch(()=>{});
          const consultations = await patientApi.getConsultations(pat.id);
          if (consultations && consultations.length > 0) {
            setActiveConsultation(consultations[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (loading) return <div className="py-20 text-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      {followUps.length > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <p className="font-bold text-emerald-900">🗓️ {t('patient.followup_reminder', 'Follow-up reminder')}</p>
          <p className="text-sm text-emerald-800 mt-1">{followUps[0].message}</p>
          <p className="text-xs text-emerald-700 mt-1">{t('patient.due', 'Due')} {new Date(followUps[0].due_at).toLocaleDateString()}</p>
        </div>
      )}

      {/* Top Header Controls with HomeButton */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HomeButton label={t('nav.back_to_home', 'Back to Homepage')} />
        <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
          📍 {t('nav.jaipur_portal', 'Jaipur Patient Portal')} ({user?.full_name || 'Aarav Sharma'})
        </span>
      </div>

      {/* Welcome Banner */}
      <div className="bg-teal-600 rounded-2xl p-5 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {t('patient.good_morning', 'Good morning')}, {user?.full_name?.split(' ')[0] || 'Aarav'}
          </h1>
          <p className="text-teal-100 max-w-lg mb-6 text-sm sm:text-base">
            {t('patient.welcome_msg', 'Your health is our priority. Complete your clinical intake or talk to the AI health assistant before your consultation.')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/patient/interview" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto bg-white text-teal-700 hover:bg-teal-50 border border-teal-200 shadow-md font-bold min-h-[44px]">
                {t('patient.start_intake_btn', 'Start Clinical Intake (0%)')}
              </Button>
            </Link>
            <Link to="/patient/documents" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 text-white border-none shadow-sm min-h-[44px]">
                {t('patient.upload_reports_btn', 'Upload Reports')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid - Separate Survey and AI Assistant */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <QuickActionCard 
          icon="📋" 
          title={t('patient.action_survey_title', 'Clinical Survey')} 
          desc={t('patient.action_survey_desc', 'Structured questions (Starts 0%)')} 
          to="/patient/interview" 
        />
        <QuickActionCard 
          icon="🤖" 
          title={t('patient.action_ai_title', 'AI Assistant')} 
          desc={t('patient.action_ai_desc', 'Conversational triage')} 
          to="/patient/interview" 
        />
        <QuickActionCard 
          icon="📄" 
          title={t('patient.action_docs_title', 'Documents')} 
          desc={t('patient.action_docs_desc', 'Upload prescriptions')} 
          to="/patient/documents" 
        />
        <QuickActionCard 
          icon="🩺" 
          title={t('patient.action_timeline_title', 'Timeline')} 
          desc={t('patient.action_timeline_desc', 'Medical chronology')} 
          to="/patient/history" 
        />
        <QuickActionCard 
          icon="🚑" 
          title={t('patient.action_ambulance_title', 'Ambulance')} 
          desc={t('patient.action_ambulance_desc', 'Jaipur emergency network')} 
          to="/patient/ambulance" 
          danger 
        />
      </div>

      {/* Main Content Area */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">{t('patient.current_status', 'Current Status')}</h2>
          
          {activeConsultation ? (
            <Card>
              <CardBody>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{t('patient.today_consultation', "Today's Consultation")}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(activeConsultation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={activeConsultation.status} />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">{t('patient.chief_complaint', 'Chief Complaint')}</p>
                  <p className="text-gray-900">{activeConsultation.chief_complaint || t('patient.not_specified', 'Not specified yet')}</p>
                </div>
                
                {activeConsultation.status === 'WAITING' || activeConsultation.status === 'AI_INTERVIEW' ? (
                  <Link to="/patient/interview">
                    <Button className="w-full">{t('patient.continue_case', 'Continue Case Taking')}</Button>
                  </Link>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>{t('patient.ready_for_doctor', 'Ready for Doctor')}</Button>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="text-center py-8">
                <div className="text-4xl mb-3">👨‍⚕️</div>
                <h3 className="font-bold text-gray-900 mb-2">{t('patient.no_active_consultation', 'No active consultation')}</h3>
                <p className="text-sm text-gray-500 mb-4">{t('patient.start_session_desc', 'Start a new health history session to create one.')}</p>
                <Link to="/patient/interview">
                  <Button>{t('patient.start_new_session', 'Start New Session')}</Button>
                </Link>
              </CardBody>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('patient.recent_documents', 'Recent Documents')}</h2>
          <Card>
            <CardBody className="p-0">
              <div className="divide-y divide-gray-100">
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl">📄</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('patient.blood_test_report', 'Blood Test Report')}</p>
                      <p className="text-xs text-gray-500">{t('patient.added_yesterday', 'Added yesterday')}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xl">💊</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('patient.previous_prescription', 'Previous Prescription')}</p>
                      <p className="text-xs text-gray-500">Aug 15, 2026</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-center rounded-b-xl">
                <Link to="/patient/documents" className="text-sm text-teal-600 font-medium hover:text-teal-700">
                  {t('patient.view_all_docs', 'View All Documents')}
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ icon, title, desc, to, danger }: any) {
  return (
    <Link to={to} className="block group">
      <div className={`p-4 rounded-xl border transition-all ${
        danger 
          ? 'bg-red-50 border-red-100 hover:bg-red-100 hover:border-red-200 shadow-sm' 
          : 'bg-white border-gray-200 hover:shadow-md hover:border-teal-300'
      }`}>
        <div className="text-2xl mb-2">{icon}</div>
        <h3 className={`font-bold text-sm mb-1 ${danger ? 'text-red-800' : 'text-gray-900'}`}>{title}</h3>
        <p className={`text-xs ${danger ? 'text-red-600' : 'text-gray-500'} hidden sm:block`}>{desc}</p>
      </div>
    </Link>
  );
}
