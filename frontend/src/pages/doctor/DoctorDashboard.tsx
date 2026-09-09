import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { doctorApi } from '../../api/client';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { HomeButton } from '../../components/shared/HomeButton';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { DoctorCommunication, QueueItem } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

export function DoctorDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [communications, setCommunications] = useState<DoctorCommunication[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, commsData, queueData] = await Promise.allSettled([
          doctorApi.getStats(),
          doctorApi.getCommunications(),
          doctorApi.getQueue()
        ]);
        if (statsData.status === 'fulfilled') setStats(statsData.value);
        if (commsData.status === 'fulfilled' && commsData.value) {
          setCommunications(commsData.value);
        }
        if (queueData.status === 'fulfilled' && queueData.value) {
          setQueue(queueData.value);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.full_name || 'Dr. Sneha Reddy'} • MediKiosk OPD
          </h1>
          <p className="text-gray-500 text-sm">
            Clinical Triage & Consultation • Affiliated Healthcare Network
          </p>
        </div>
        <HomeButton label="Back to Homepage" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title={t('doctor.patients_today', 'Patients Today')} value={stats?.patients_today ?? 0} icon="👥" color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="AI Histories Done" value={stats?.consultations_completed ?? 0} icon="🤖" color="text-teal-600" bg="bg-teal-50" />
        <StatCard title={t('doctor.pending_review', 'Pending Reviews')} value={stats?.pending_reviews ?? 0} icon="📋" color="text-purple-600" bg="bg-purple-50" />
        <StatCard title={t('doctor.active_alerts', 'Emergency Alerts')} value={stats?.emergency_alerts ?? 0} icon="🚨" color="text-red-600" bg="bg-red-50" alert={(stats?.emergency_alerts ?? 0) > 0} />
      </div>

      {/* 💬 Patient Communication Card */}
      <Card className="border-emerald-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-b border-emerald-100 flex justify-between items-center py-3.5 px-5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💬</span>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Patient Communication</h3>
              <p className="text-xs text-emerald-800">Active triage consultations & direct patient messaging</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Communication Channel
          </span>
        </CardHeader>
        <CardBody className="p-0 divide-y divide-gray-100">
          {communications.length > 0 ? (
            communications.map((comm) => (
              <div key={comm.consultation_id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-emerald-50/30 transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{comm.patient_name}</span>
                    <span className="text-xs text-gray-500">({comm.age}y, {comm.gender})</span>
                    {comm.unread && (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-red-200 animate-pulse">
                        🔴 Unread Patient Message
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 flex items-baseline gap-1">
                    <span className="font-semibold text-gray-700">Patient Query:</span>
                    <span className="italic text-gray-800 font-medium">"{comm.chief_complaint}"</span>
                  </div>
                  <div className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-2 max-w-2xl text-gray-700 flex items-start gap-1.5">
                    <span className="font-bold text-teal-700 shrink-0">Latest Message:</span>
                    <span className="truncate">{comm.latest_message}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-gray-400">
                    {comm.timestamp ? new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  <Link
                    to={`/doctor/patient/${comm.patient_id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap"
                  >
                    <span>💬 Open Patient Profile & Chat</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">
              No active patient consultation messages yet.
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h3 className="font-bold text-gray-900">Clinical Triage Hub</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <Link to="/doctor/queue" className="bg-teal-50 hover:bg-teal-100 p-4 rounded-2xl border border-teal-200 transition-colors flex items-center gap-3 block">
              <div className="text-3xl">🧑‍⚕️</div>
              <div>
                <h4 className="font-bold text-teal-900 text-sm">Patient Queue</h4>
                <p className="text-xs text-teal-700">Review AI summaries & clinical verify</p>
              </div>
            </Link>
            <Link to="/doctor/alerts" className="bg-red-50 hover:bg-red-100 p-4 rounded-2xl border border-red-200 transition-colors flex items-center gap-3 block">
              <div className="text-3xl">🚨</div>
              <div>
                <h4 className="font-bold text-red-900 text-sm">Emergency Alerts & Radar</h4>
                <p className="text-xs text-red-700">Active red-flag alerts & ambulances</p>
              </div>
            </Link>
          </CardBody>
        </Card>

        {/* Real Live Patient Queue Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">Today's Patient Queue</h3>
                <p className="text-xs text-gray-500">Live patients waiting for clinical review</p>
              </div>
              <Link to="/doctor/queue" className="text-xs text-teal-600 font-bold hover:underline">View All ({queue.length}) →</Link>
            </div>
          </CardHeader>
          <CardBody className="divide-y divide-gray-100 p-0">
            {queue.length > 0 ? (
              queue.slice(0, 5).map((item) => (
                <div key={item.id || item.consultation_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm shrink-0">
                      {item.patient_name?.charAt(0) || 'P'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-gray-900 truncate">
                        {item.patient_name} ({item.patient_age || 0}y, {item.patient_gender || 'M'})
                      </h4>
                      <p className="text-xs text-amber-900 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-0.5 max-w-full sm:max-w-sm truncate">
                        Query: "{item.chief_complaint || 'Triage Intake'}"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <PriorityBadge priority={item.priority} />
                    <Link
                      to={`/doctor/patient/${item.patient_id}`}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300 transition-colors shadow-2xs"
                    >
                      {t('doctor.check_profile', 'Check Patient Profile')} →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                No patients currently waiting in queue.
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg, alert }: any) {
  return (
    <Card className={alert ? 'border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}>
      <CardBody className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${bg} ${color}`}>
          {icon}
        </div>
      </CardBody>
    </Card>
  );
}
