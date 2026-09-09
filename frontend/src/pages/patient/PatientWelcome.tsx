import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { patientApi } from '../../api/client';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTranslation } from '../../hooks/useTranslation';

export function PatientWelcome() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();

  useEffect(() => {
    if (user) {
      patientApi.getByUserId(user.id)
        .then(p => {
          if (!p.date_of_birth || !p.emergency_contact_name || !p.emergency_contact_phone) {
            nav('/patient/profile-setup', { replace: true });
          } else {
            patientApi.getMedicalHistory(p.id)
              .then(h => {
                if (!h.completed) nav('/patient/profile-setup', { replace: true });
              })
              .catch(() => nav('/patient/profile-setup', { replace: true }));
          }
        })
        .catch(() => {});
    }
  }, [user, nav]);

  return (
    <div className="max-w-5xl mx-auto py-5 sm:py-10 space-y-6">
      {/* Green Hero Section */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <svg width="240" height="240" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>

        <div className="relative z-10">
          <p className="text-emerald-100 text-xs sm:text-sm font-semibold tracking-wide uppercase">
            {t('patient.welcome_badge', 'Jaipur Smart Health Kiosk')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1">
            {t('patient.welcome_title', 'Welcome to MediKiosk')}, {user?.full_name?.split(' ')[0] || 'Patient'} 👋
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-50 text-sm sm:text-base leading-relaxed">
            {t('patient.welcome_desc', 'Your profile, previous health reports, adaptive clinical survey, doctor review, and follow-ups stay seamlessly connected.')}
          </p>

          {/* Action Buttons with high-contrast text */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
            <Link to="/patient/profile" className="w-full sm:w-auto">
              <Button
                variant="white"
                className="w-full sm:w-auto !bg-white !text-emerald-900 hover:!bg-emerald-50 font-bold px-5 py-3 sm:py-2.5 shadow-md text-sm sm:text-base border border-white min-h-[44px]"
              >
                {t('patient.view_report', 'View Health Report')} →
              </Button>
            </Link>
            <Link to="/patient/interview" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto !border-2 !border-white !text-white hover:!bg-white/20 font-bold px-5 py-3 sm:py-2.5 text-sm sm:text-base transition-colors min-h-[44px]"
              >
                {t('patient.take_survey', 'Take Health Survey')} →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardBody>
            <div className="text-3xl mb-2">🩺</div>
            <h3 className="font-bold text-gray-900 text-base">Health Report</h3>
            <p className="text-sm text-gray-500 mt-1">
              Previous AI clinical history, validated diagnoses, and clinician-ready information.
            </p>
            <Link to="/patient/profile" className="text-emerald-700 font-bold text-sm inline-block mt-3 hover:underline">
              Open report →
            </Link>
          </CardBody>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardBody>
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-bold text-gray-900 text-base">Adaptive Survey</h3>
            <p className="text-sm text-gray-500 mt-1">
              Dynamic AI clinical case-taking that adapts questions according to your symptoms.
            </p>
            <Link to="/patient/interview" className="text-emerald-700 font-bold text-sm inline-block mt-3 hover:underline">
              Start survey →
            </Link>
          </CardBody>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardBody>
            <div className="text-3xl mb-2">🏥</div>
            <h3 className="font-bold text-gray-900 text-base">Nearby Care</h3>
            <p className="text-sm text-gray-500 mt-1">
              Find verified clinics, emergency departments, and hospitals around your current location.
            </p>
            <Link to="/patient/clinics" className="text-emerald-700 font-bold text-sm inline-block mt-3 hover:underline">
              Find nearby care →
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

