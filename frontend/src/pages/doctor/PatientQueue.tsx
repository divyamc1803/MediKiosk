import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doctorApi } from '../../api/client';
import { Card, CardBody } from '../../components/ui/Card';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { QueueItem } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

export function PatientQueue() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchQueue();
    // In a real app we'd set up a websocket subscription here
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const data = await doctorApi.getQueue();
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredQueue = queue.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'NEEDS_REVIEW') return item.status === 'NEEDS_REVIEW';
    if (filter === 'EMERGENCY') return item.status === 'EMERGENCY' || item.priority === 'CRITICAL';
    return true;
  }).sort((a, b) => {
    // Sort by priority (CRITICAL > HIGH > NORMAL) then by time
    const pWeight = { CRITICAL: 3, HIGH: 2, NORMAL: 1 };
    if (pWeight[a.priority] !== pWeight[b.priority]) {
      return pWeight[b.priority] - pWeight[a.priority];
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('doctor.queue', "Today's Queue")}</h1>
          <p className="text-xs sm:text-sm text-gray-500">Manage patient consultations and review AI histories.</p>
        </div>
        
        <div className="flex flex-wrap bg-white rounded-xl border border-gray-200 p-1 w-full sm:w-auto shadow-2xs">
          <button 
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors text-center ${filter === 'ALL' ? 'bg-gray-100 text-gray-900 shadow-2xs' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setFilter('ALL')}
          >
            All Patients
          </button>
          <button 
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors text-center ${filter === 'NEEDS_REVIEW' ? 'bg-purple-50 text-purple-700 shadow-2xs' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setFilter('NEEDS_REVIEW')}
          >
            Needs Review
          </button>
          <button 
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors text-center ${filter === 'EMERGENCY' ? 'bg-red-50 text-red-700 shadow-2xs' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setFilter('EMERGENCY')}
          >
            Emergencies
          </button>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="p-4 rounded-tl-xl">Patient</th>
                  <th className="p-4">Chief Complaint</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Info</th>
                  <th className="p-4 text-right rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No patients in queue matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                            {item.patient_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{item.patient_name}</p>
                            <p className="text-xs text-gray-500">{item.patient_age} yrs • {item.patient_gender}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.chief_complaint || 'Not specified'}</p>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-4">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {item.has_history && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-medium">History</span>}
                          {item.document_count > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">{item.document_count} Docs</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Link to={`/doctor/patient/${item.patient_id}`}>
                          <button className="text-emerald-700 font-bold text-xs hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300 transition-colors shadow-2xs">
                            {t('doctor.check_profile', 'Check Patient Profile')} →
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
