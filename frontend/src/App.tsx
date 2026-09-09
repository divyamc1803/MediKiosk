import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RequireAuth, useAuth } from './hooks/useAuth';
import { Navbar, DoctorSidebar } from './components/shared/Navbar';
import { Footer } from './components/shared/Footer';

// Pages - Website & Auth
import { LandingPage } from './pages/website/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Pages - Patient
import { PatientHome } from './pages/patient/PatientHome';
import { AIInterview } from './pages/patient/AIInterview';
import { DocumentUpload } from './pages/patient/DocumentUpload';
import { AmbulanceRequest } from './pages/patient/AmbulanceRequest';
import { PatientProfile } from './pages/patient/PatientProfile';
import { MedicalTimeline } from './pages/patient/MedicalTimeline';
import { MedicalHistory } from './pages/patient/MedicalHistory';
import { ProfileSetup } from './pages/patient/ProfileSetup';
import { PatientWelcome } from './pages/patient/PatientWelcome';
import { NearbyClinics } from './pages/patient/NearbyClinics';

// Pages - Doctor
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { PatientQueue } from './pages/doctor/PatientQueue';
import { PatientClinicalView } from './pages/doctor/PatientClinicalView';
import { EmergencyAlerts } from './pages/doctor/EmergencyAlerts';

// Pages - Kiosk
import { KioskHome } from './pages/kiosk/KioskHome';
import { KioskInterview } from './pages/kiosk/KioskInterview';

// Pages - Driver & Hospital
import { DriverHome } from './pages/driver/DriverHome';
import { DriverTrip } from './pages/driver/DriverTrip';
import { HospitalDashboard } from './pages/hospital/HospitalDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DemoSelector } from './pages/demo/DemoSelector';
import { DemoControlPanel } from './components/demo/DemoControlPanel';

function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between w-full max-w-full overflow-x-hidden">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-8 min-w-0">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();
  const isDemoRoute = location.pathname === '/demo' || location.pathname.startsWith('/demo/');
  const showDemoPanel = isDemoRoute || Boolean(user?.email?.includes('demo'));
  return (
    <>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/demo" element={<DemoSelector />} />

      {/* Patient Routes */}
      <Route path="/patient/welcome" element={<RequireAuth roles={['PATIENT']}><PatientLayout><PatientWelcome /></PatientLayout></RequireAuth>} />
      <Route path="/patient/profile-setup" element={<RequireAuth roles={['PATIENT']}><PatientLayout><ProfileSetup /></PatientLayout></RequireAuth>} />
      <Route path="/patient/medical-history" element={<RequireAuth roles={['PATIENT']}><PatientLayout><MedicalHistory /></PatientLayout></RequireAuth>} />
      <Route path="/patient/clinics" element={<RequireAuth roles={['PATIENT']}><PatientLayout><NearbyClinics /></PatientLayout></RequireAuth>} />
      <Route path="/patient" element={<RequireAuth roles={['PATIENT']}><PatientLayout><PatientHome /></PatientLayout></RequireAuth>} />
      <Route path="/patient/interview" element={<RequireAuth roles={['PATIENT']}><PatientLayout><AIInterview /></PatientLayout></RequireAuth>} />
      <Route path="/patient/documents" element={<RequireAuth roles={['PATIENT']}><PatientLayout><DocumentUpload /></PatientLayout></RequireAuth>} />
      <Route path="/patient/ambulance" element={<RequireAuth roles={['PATIENT']}><PatientLayout><AmbulanceRequest /></PatientLayout></RequireAuth>} />
      <Route path="/patient/profile" element={<RequireAuth roles={['PATIENT']}><PatientLayout><PatientProfile /></PatientLayout></RequireAuth>} />
      <Route path="/patient/history" element={<RequireAuth roles={['PATIENT']}><PatientLayout><MedicalTimeline /></PatientLayout></RequireAuth>} />

      {/* Doctor Routes */}
      <Route path="/doctor/*" element={
        <RequireAuth roles={['DOCTOR']}>
          <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row w-full max-w-full overflow-x-hidden">
            <DoctorSidebar />
            <main className="flex-1 min-w-0 w-full overflow-x-hidden p-3 sm:p-6">
              <Routes>
                <Route path="/" element={<DoctorDashboard />} />
                <Route path="/queue" element={<PatientQueue />} />
                <Route path="/patient/:id" element={<PatientClinicalView />} />
                <Route path="/alerts" element={<EmergencyAlerts />} />
                {/* Fallback to dashboard */}
                <Route path="*" element={<Navigate to="/doctor" />} />
              </Routes>
            </main>
          </div>
        </RequireAuth>
      } />

      {/* Driver Routes */}
      <Route path="/driver/*" element={
        <RequireAuth roles={['DRIVER']}>
          <Routes>
            <Route path="/" element={<DriverHome />} />
            <Route path="/trip/:id" element={<DriverTrip />} />
            <Route path="*" element={<Navigate to="/driver" />} />
          </Routes>
        </RequireAuth>
      } />

      {/* Staff / Hospital Routes */}
      <Route path="/hospital" element={
        <RequireAuth roles={['STAFF']}>
          <HospitalDashboard />
        </RequireAuth>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <RequireAuth roles={['ADMIN']}>
          <AdminDashboard />
        </RequireAuth>
      } />

      {/* Kiosk Routes */}
      <Route path="/kiosk" element={<KioskHome />} />
      <Route path="/kiosk/interview" element={<KioskInterview />} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    {showDemoPanel && <DemoControlPanel />}
    </>
  );
}
