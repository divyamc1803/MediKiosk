import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doctorApi } from '../../api/client';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { TextArea } from '../../components/ui/Input';
import { ConsultationChat } from '../../components/shared/ConsultationChat';
import { useTranslation } from '../../hooks/useTranslation';

const MEDICAL_HISTORY_FIELDS: { key: string; label: string }[] = [
  { key: 'chronic_conditions', label: '1. Chronic / Long-term Conditions' },
  { key: 'previous_hospitalizations', label: '2. Previous Hospital Admissions' },
  { key: 'surgeries', label: '3. Past Surgeries / Procedures' },
  { key: 'allergies', label: '4. Known Allergies (Medicine/Food/Env)' },
  { key: 'serious_allergic_reaction', label: '5. Serious Allergic Reactions' },
  { key: 'current_medications', label: '6. Current Medications & Prescriptions' },
  { key: 'supplements_ayurvedic', label: '7. Supplements & Ayurvedic Medicines' },
  { key: 'previous_diagnoses', label: '8. Previous Diagnoses by Doctor' },
  { key: 'family_history', label: '9. Family Medical History' },
  { key: 'major_injuries', label: '10. Major Injuries / Physical Trauma' },
  { key: 'blood_history', label: '11. Blood Transfusions / Disorders' },
  { key: 'ongoing_undiagnosed_concerns', label: '12. Ongoing Undiagnosed Concerns' },
  { key: 'recent_doctor_visits', label: '13. Recent Doctor / Clinic Visits' },
  { key: 'previous_treatments', label: '14. Past Treatments / Investigations' },
  { key: 'additional_history', label: '15. Additional Medical History / Habits' },
];

export function PatientClinicalView() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [expandedOcr, setExpandedOcr] = useState<Record<string, boolean>>({});

  // Note Form
  const [notes, setNotes] = useState({
    observations: '', assessment: '', plan: '', prescription_notes: ''
  });
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (id) fetchPatient(id);
  }, [id]);

  const fetchPatient = async (patientId: string) => {
    try {
      const data = await doctorApi.getPatient(patientId);
      setPatientData(data);
      if (data?.notes) {
        setNotes({
          observations: data.notes.observations || '',
          assessment: data.notes.assessment || '',
          plan: data.notes.plan || '',
          prescription_notes: data.notes.prescription_notes || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (action: 'VERIFY' | 'REJECT', sectionKey?: string) => {
    if (!patientData?.consultation?.id) return;
    try {
      const data: any = { action };
      if (action === 'VERIFY' && sectionKey && editingSection === sectionKey) {
        data.sections = { [sectionKey]: editContent };
      }
      await doctorApi.verifySummary(patientData.consultation.id, data);
      setEditingSection(null);
      fetchPatient(id!);
    } catch (err) {
      alert("Failed to verify summary");
    }
  };

  const saveNotes = async () => {
    if (!patientData?.consultation?.id) return;
    setSavingNotes(true);
    try {
      await doctorApi.addNote({
        consultation_id: patientData.consultation.id,
        ...notes
      });
      alert("Doctor notes saved successfully");
    } catch (err) {
      alert("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;
  if (!patientData || !patientData.patient) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Patient Not Found</h2>
        <p className="text-gray-500 mb-4">The requested patient profile could not be loaded.</p>
        <Link to="/doctor/queue">
          <Button variant="outline">← Back to Patient Queue</Button>
        </Link>
      </div>
    );
  }

  const { patient, consultation, history, documents, case_taking, medications, allergies } = patientData;
  const medicalHistory = patient.medical_history || patientData.medical_history || {};

  const renderHistorySection = (title: string, key: string, content: string | null) => {
    const isEditing = editingSection === key;
    return (
      <div className="mb-5 border-b border-gray-100 pb-5 last:border-0 last:pb-0 group">
        <div className="flex justify-between items-start mb-1.5">
          <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
          <div className="flex gap-2">
            {!isEditing ? (
              <button 
                onClick={() => { setEditingSection(key); setEditContent(content || ''); }}
                className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded hover:bg-teal-100 transition-colors"
              >
                Edit
              </button>
            ) : (
              <>
                <button onClick={() => setEditingSection(null)} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Cancel</button>
                <button onClick={() => handleVerify('VERIFY', key)} className="text-xs text-white bg-teal-600 px-2 py-0.5 rounded">Save & Verify</button>
              </>
            )}
          </div>
        </div>
        {isEditing ? (
          <TextArea 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="text-sm font-mono mt-2"
          />
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {content || <span className="text-gray-400 italic">Not reported</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/doctor/queue" className="text-gray-500 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition-colors text-sm font-bold flex items-center gap-1">
            <span>←</span> {t('doctor.back_to_queue', 'Back to Queue')}
          </Link>
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              {patient.user?.full_name || 'Patient Clinical Profile'}
              {consultation?.status && <StatusBadge status={consultation.status} />}
              {consultation?.priority && <PriorityBadge priority={consultation.priority} />}
            </h1>
            <p className="text-xs text-gray-500">
              Consultation ID: <span className="font-mono">{consultation?.id?.slice(0, 8)}</span> • Checked-in: {consultation?.created_at ? new Date(consultation.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {history?.doctor_verified ? (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-green-200">
              {t('doctor.verified_badge', '✓ Doctor Verified')}
            </span>
          ) : (
            <Button size="sm" onClick={() => handleVerify('VERIFY')}>
              {t('doctor.verify_summary', 'Verify Full Summary')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Demographics, Notes, Active Meds, Allergies */}
        <div className="space-y-6">
          {/* Demographics Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100 py-3 px-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span>👤</span> Patient Demographics
              </h3>
            </CardHeader>
            <CardBody className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl font-black shadow-sm shrink-0">
                  {patient.user?.full_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">{patient.user?.full_name}</h2>
                  <p className="text-xs text-gray-500 font-medium">
                    {patient.age ? `${patient.age} yrs` : 'Age N/A'} • {patient.gender || 'Unknown'} • Blood: <span className="font-bold text-red-600">{patient.blood_group || 'Unknown'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500">Preferred Language</span>
                  <span className="font-bold text-gray-900 uppercase">{patient.preferred_language || 'en'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500">ABHA Health ID</span>
                  <span className="font-mono font-bold text-teal-800">{patient.abha_id || 'Not linked'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium text-gray-900">{patient.user?.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500">Emergency Contact</span>
                  <span className="font-medium text-gray-900">{patient.emergency_contact_name || 'Not provided'}</span>
                </div>
                {patient.emergency_contact_phone && (
                  <div className="flex justify-between border-b border-gray-100 pb-1.5">
                    <span className="text-gray-500">Emergency Phone</span>
                    <span className="font-mono text-gray-900">{patient.emergency_contact_phone}</span>
                  </div>
                )}
                <div className="flex justify-between pb-1">
                  <span className="text-gray-500">Address / Ward</span>
                  <span className="font-medium text-gray-900 truncate max-w-[180px] text-right">{patient.address || 'Jaipur, Rajasthan'}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Doctor's Notes Card */}
          <Card className="border-teal-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 py-3 px-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span>📝</span> Clinical Consultation Notes
              </h3>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">Doctor Entry</span>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              <TextArea 
                label="Clinical Observations & Findings" 
                placeholder="Vitals, physical examination findings, general condition..."
                value={notes.observations}
                onChange={e => setNotes({...notes, observations: e.target.value})}
                rows={2}
              />
              <TextArea 
                label="Assessment / Diagnosis" 
                placeholder="Primary provisional diagnosis, differential diagnosis..."
                value={notes.assessment}
                onChange={e => setNotes({...notes, assessment: e.target.value})}
                rows={2}
              />
              <TextArea 
                label="Plan & Prescription" 
                placeholder="Prescribed medications, recommended tests, lifestyle advice..."
                value={notes.prescription_notes}
                onChange={e => setNotes({...notes, prescription_notes: e.target.value})}
                rows={3}
              />
              <Button className="w-full font-bold" onClick={saveNotes} loading={savingNotes}>
                💾 Save Doctor Notes
              </Button>
            </CardBody>
          </Card>

          {/* Active Medication History */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-3 px-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span>💊</span> Medication History ({medications?.length || 0})
              </h3>
            </CardHeader>
            <CardBody className="p-4">
              {medications && medications.length > 0 ? (
                <div className="divide-y divide-gray-100 text-xs">
                  {medications.map((m: any) => (
                    <div key={m.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900">{m.name}</p>
                        <p className="text-gray-500">{m.dosage || 'Dosage N/A'} • {m.frequency || 'Daily'}</p>
                        <span className="inline-block mt-0.5 text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-100">
                          {m.source === 'DOCUMENT_EXTRACTED' ? '📄 Document Extracted' : '👤 Patient Reported'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {m.is_active ? 'Active' : 'Past'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-2">No active medications reported.</p>
              )}
            </CardBody>
          </Card>

          {/* Allergies Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-3 px-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span>⚠️</span> Known Allergies ({allergies?.length || 0})
              </h3>
            </CardHeader>
            <CardBody className="p-4">
              {allergies && allergies.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {allergies.map((a: any) => (
                    <div key={a.id} className="p-2 bg-red-50/60 border border-red-200 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-red-900">{a.allergen}</p>
                        <p className="text-red-700 text-[11px]">{a.reaction || 'Hypersensitivity reaction'}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                        {a.severity || 'MILD'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-2">No known drug or food allergies.</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column (Span 2): Intake Query, Medical History, AI Summary, Documents, Chat */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prominent Original Patient Intake Query */}
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🗣️</span>
                <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  Original Patient Query / Stated Words
                </h3>
              </div>
              <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                Direct Intake Wording
              </span>
            </div>
            <p className="text-lg sm:text-xl font-black text-gray-900 leading-relaxed italic pl-1">
              "{consultation?.chief_complaint || history?.chief_complaint || 'Patient reported acute symptoms during clinical triage'}"
            </p>
            <p className="text-xs text-amber-800 mt-2 pl-1">
              Captured verbatim at kiosk / intake check-in prior to AI interview synthesis.
            </p>
          </div>

          {/* Emergency Red Flags Alert (if any) */}
          {history?.red_flags && history.red_flags.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex gap-3.5 items-start shadow-sm">
              <div className="text-3xl shrink-0">🚨</div>
              <div>
                <h3 className="font-black text-red-900 text-sm mb-1 uppercase tracking-wide">
                  Emergency Red Flags Detected by AI
                </h3>
                <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                  {history.red_flags.map((rf: any, i: number) => (
                    <li key={i}>
                      <span className="font-bold">{typeof rf === 'object' ? rf.keyword?.toUpperCase() : String(rf).toUpperCase()}</span>
                      {rf.category && ` — Suggests ${rf.category}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 15-Question Medical History Questionnaire Card */}
          <Card className="border-teal-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100 py-3.5 px-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                    15-Question Medical History Questionnaire
                  </h3>
                  <p className="text-xs text-teal-800">
                    Patient completed self-report during onboarding / kiosk intake
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-teal-100 text-teal-800 px-3 py-1 rounded-full border border-teal-200">
                15 Mandatory Fields
              </span>
            </CardHeader>
            <CardBody className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {MEDICAL_HISTORY_FIELDS.map(({ key, label }) => {
                  const val = medicalHistory[key];
                  const hasAnswer = val && String(val).trim() !== '' && String(val).trim().toLowerCase() !== 'n/a';
                  return (
                    <div key={key} className="p-3 bg-gray-50/70 border border-gray-100 rounded-xl hover:bg-white hover:border-teal-200 transition-colors">
                      <p className="text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1">
                        {label}
                      </p>
                      <p className="text-xs text-gray-800 leading-relaxed font-medium">
                        {hasAnswer ? String(val) : <span className="text-gray-400 italic">Not provided</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* AI Case-Taking Summary Card */}
          <Card className="border-teal-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-white p-4 border-b border-teal-100 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🤖</span>
                <div>
                  <h2 className="text-base font-black text-teal-950">AI Case-Taking Summary</h2>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[11px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium">
                      Conversational Triage Intake
                    </span>
                    {history?.doctor_verified ? (
                      <span className="text-[11px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">
                        ✓ Doctor Verified
                      </span>
                    ) : (
                      <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        Needs Doctor Verification
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {case_taking?.transcript && case_taking.transcript.length > 0 && (
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-xs font-bold text-teal-700 bg-white border border-teal-200 px-3 py-1.5 rounded-xl hover:bg-teal-50 transition-colors"
                  >
                    {showTranscript ? 'Hide Interview Transcript' : `View Interview Transcript (${case_taking.transcript.length})`}
                  </button>
                )}
                {!history?.doctor_verified && (
                  <Button size="sm" onClick={() => handleVerify('VERIFY')}>Verify All</Button>
                )}
              </div>
            </div>

            <CardBody className="p-5">
              {history ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-teal-50/40 rounded-xl border border-teal-100">
                    <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-1">Chief Complaint</h4>
                    <p className="text-base font-bold text-gray-900">
                      {history.chief_complaint || consultation?.chief_complaint || 'General Clinical Follow-up'}
                    </p>
                  </div>

                  {renderHistorySection("History of Present Illness (HPI)", "hpi", history.hpi)}
                  {renderHistorySection("Past Medical History", "past_medical", history.past_medical)}
                  {renderHistorySection("Past Surgical History", "past_surgical", history.past_surgical)}
                  {renderHistorySection("Drug History", "drug_history", history.drug_history)}
                  {renderHistorySection("Allergy History", "allergy_history", history.allergy_history)}
                  {renderHistorySection("Family History", "family_history", history.family_history)}
                  {renderHistorySection("Personal & Social History", "personal_history", history.personal_history)}
                  {renderHistorySection("Review of Systems", "review_of_systems", history.review_of_systems)}

                  {history.ayurvedic_history && Object.keys(history.ayurvedic_history).length > 0 && (
                    <div className="mt-6 pt-5 border-t border-gray-200">
                      <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                        <span>🌿</span> Ayurvedic Holistic Assessment
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {history.ayurvedic_history.prakriti && (
                          <div className="bg-green-50 p-2.5 rounded-xl border border-green-100">
                            <span className="text-gray-500 block mb-0.5">Prakriti</span>
                            <span className="font-bold text-green-900">{history.ayurvedic_history.prakriti}</span>
                          </div>
                        )}
                        {history.ayurvedic_history.agni && (
                          <div className="bg-green-50 p-2.5 rounded-xl border border-green-100">
                            <span className="text-gray-500 block mb-0.5">Agni (Digestion)</span>
                            <span className="font-bold text-green-900">{history.ayurvedic_history.agni}</span>
                          </div>
                        )}
                        {history.ayurvedic_history.koshta && (
                          <div className="bg-green-50 p-2.5 rounded-xl border border-green-100">
                            <span className="text-gray-500 block mb-0.5">Koshta (Bowels)</span>
                            <span className="font-bold text-green-900">{history.ayurvedic_history.koshta}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <span className="text-3xl mb-2 inline-block">📋</span>
                  <p className="font-bold text-gray-700 text-sm">No case-taking session available</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    The patient has not completed the AI clinical interview yet or checked in directly at the OPD desk.
                  </p>
                </div>
              )}

              {/* Collapsible Interview Transcript */}
              {showTranscript && case_taking?.transcript && (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Full AI Interview Transcript ({case_taking.transcript.length} messages)
                  </h3>
                  <div className="max-h-80 overflow-y-auto space-y-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    {case_taking.transcript.map((msg: any) => {
                      const isAi = msg.role === 'AI';
                      return (
                        <div key={msg.id} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] p-3 rounded-xl ${isAi ? 'bg-white border border-gray-200 text-gray-800' : 'bg-teal-600 text-white'}`}>
                            <div className="flex justify-between items-center gap-2 mb-1 text-[10px] font-bold">
                              <span>{isAi ? '🤖 Clinical AI Bot' : '👤 Patient'}</span>
                              <span className={isAi ? 'text-gray-400' : 'text-teal-200'}>
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            {msg.translated_content && msg.translated_content !== msg.content && (
                              <p className={`mt-1 pt-1 border-t text-[10px] italic ${isAi ? 'border-gray-100 text-gray-500' : 'border-teal-500 text-teal-100'}`}>
                                Translated: "{msg.translated_content}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Medical Documents & OCR Extractions Card */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-3.5 px-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Medical Documents & Extraction Intelligence ({documents?.length || 0})
                </h3>
              </div>
            </CardHeader>
            <CardBody className="p-5 space-y-4">
              {documents && documents.length > 0 ? (
                documents.map((doc: any) => {
                  const ext = doc.extraction;
                  const extData = ext?.extracted_data;
                  const isOcrOpen = Boolean(expandedOcr[doc.id]);

                  return (
                    <div key={doc.id} className="border border-gray-200 rounded-2xl p-4 bg-white hover:border-teal-200 transition-colors shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold">
                            📄
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{doc.document_type?.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-gray-500">
                              {doc.file_name} • Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            doc.ocr_status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            OCR: {doc.ocr_status}
                          </span>
                          {doc.file_path && (
                            <a
                              href={`/${doc.file_path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              View Document ↗
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Raw OCR Text Toggle */}
                      {ext?.extracted_text && (
                        <div className="mt-3">
                          <button
                            onClick={() => setExpandedOcr({ ...expandedOcr, [doc.id]: !isOcrOpen })}
                            className="text-[11px] font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1"
                          >
                            <span>{isOcrOpen ? '▼ Hide' : '▶ Show'} Raw OCR Text</span>
                          </button>
                          {isOcrOpen && (
                            <pre className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {ext.extracted_text}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* Structured Extractions */}
                      {extData && (
                        <div className="mt-3 space-y-3 pt-2">
                          {/* Diagnoses */}
                          {extData.diagnoses && extData.diagnoses.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Extracted Diagnoses</p>
                              <div className="flex flex-wrap gap-1.5">
                                {extData.diagnoses.map((d: string, i: number) => (
                                  <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-bold border border-red-100">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Extracted Medications */}
                          {extData.medications && extData.medications.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Extracted Medications</p>
                              <div className="overflow-hidden rounded-xl border border-gray-100">
                                <table className="min-w-full text-xs text-left">
                                  <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                      <th className="px-3 py-1.5 font-medium">Medicine</th>
                                      <th className="px-3 py-1.5 font-medium">Dosage</th>
                                      <th className="px-3 py-1.5 font-medium">Frequency</th>
                                      <th className="px-3 py-1.5 font-medium">Duration</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                    {extData.medications.map((m: any, i: number) => (
                                      <tr key={i}>
                                        <td className="px-3 py-1.5 font-bold text-gray-900">{m.name}</td>
                                        <td className="px-3 py-1.5 text-gray-600">{m.dose || m.dosage || '-'}</td>
                                        <td className="px-3 py-1.5 text-gray-600">{m.frequency || '-'}</td>
                                        <td className="px-3 py-1.5 text-gray-600">{m.duration || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Extracted Lab Values */}
                          {extData.lab_values && extData.lab_values.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Extracted Lab Values</p>
                              <div className="overflow-hidden rounded-xl border border-gray-100">
                                <table className="min-w-full text-xs text-left">
                                  <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                      <th className="px-3 py-1.5 font-medium">Test</th>
                                      <th className="px-3 py-1.5 font-medium">Value</th>
                                      <th className="px-3 py-1.5 font-medium">Reference Range</th>
                                      <th className="px-3 py-1.5 font-medium">Flag</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                    {extData.lab_values.map((lab: any, i: number) => (
                                      <tr key={i} className={lab.is_abnormal ? 'bg-orange-50/50' : ''}>
                                        <td className="px-3 py-1.5 font-bold text-gray-900">{lab.test}</td>
                                        <td className="px-3 py-1.5 font-bold text-gray-900">
                                          {lab.value} {lab.unit || ''}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-500">{lab.ref_range || lab.reference_range || '-'}</td>
                                        <td className="px-3 py-1.5">
                                          {lab.is_abnormal ? (
                                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">ABNORMAL</span>
                                          ) : (
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">NORMAL</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <span className="text-2xl mb-1 inline-block">📄</span>
                  <p className="text-xs text-gray-500">No medical documents uploaded for this patient.</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Consultation Chat Section */}
          {consultation?.id && (
            <div className="mt-6">
              <ConsultationChat consultationId={consultation.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
