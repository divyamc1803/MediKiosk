import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { patientApi } from '../../api/client';
import { Card, CardBody } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function MedicalTimeline() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  
  // Dummy data for hackathon presentation to show concept
  const mockTimeline = [
    { id: 1, date: 'Today', title: 'Consultation Initialized', desc: 'AI Interview completed. High blood pressure noted.', type: 'CONSULT' },
    { id: 2, date: 'Aug 15, 2026', title: 'Blood Test Uploaded', desc: 'HbA1c was slightly elevated at 6.1%.', type: 'DOCUMENT' },
    { id: 3, date: 'Jul 10, 2026', title: 'Cardiology Follow-up', desc: 'ECG normal. Prescribed Atenolol 50mg.', type: 'CONSULT' },
    { id: 4, date: 'Jan 05, 2026', title: 'Emergency Visit', desc: 'Admitted for acute chest pain. Discharged after 2 days.', type: 'EMERGENCY' },
  ];

  useEffect(() => {
    // Simulated fetch
    setTimeout(() => setLoading(false), 500);
  }, [user]);

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('timeline.title', 'Your Medical Timeline')}</h1>
      
      <div className="relative border-l-2 border-teal-200 ml-4 md:ml-6 space-y-8">
        {mockTimeline.map((event, idx) => (
          <div key={event.id} className="relative pl-8">
            <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${
              event.type === 'EMERGENCY' ? 'bg-red-500' : 
              event.type === 'DOCUMENT' ? 'bg-blue-500' : 'bg-teal-500'
            }`}>
              {event.type === 'EMERGENCY' ? '🚨' : event.type === 'DOCUMENT' ? '📄' : '👨‍⚕️'}
            </div>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-lg">{event.title}</h3>
                  <span className="text-sm font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-md">{event.date}</span>
                </div>
                <p className="text-gray-600">{event.desc}</p>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
