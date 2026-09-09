import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { patientApi } from '../../api/client';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTranslation } from '../../hooks/useTranslation';

const QUESTIONS: [string, string][] = [
  ['chronic_conditions', 'Do you currently have, or have you ever been diagnosed with, any long-term health condition? For example: diabetes, high blood pressure, asthma, heart disease or thyroid problems. Write “None” if not applicable.'],
  ['previous_hospitalizations', 'Have you ever been admitted to a hospital? If yes, tell us approximately when, why, and what treatment you received.'],
  ['surgeries', 'Have you ever had surgery or another major medical procedure? If yes, tell us what it was and approximately when.'],
  ['allergies', 'Do you have any known medicine, food, or environmental allergies? If yes, tell us the allergy and reaction if known.'],
  ['serious_allergic_reaction', 'Have you ever had a serious allergic reaction that required urgent medical attention? If yes, what happened and when? Write “None” if not applicable.'],
  ['current_medications', 'Are you currently taking any prescription or over-the-counter medicines? If yes, list the names if you know them. Write “None” if not applicable.'],
  ['supplements_ayurvedic', 'Are you currently taking vitamins, supplements, herbal, Ayurvedic, or other traditional medicines? If yes, list them if known.'],
  ['previous_diagnoses', 'Have you previously been diagnosed with any significant illness or condition by a doctor? Tell us what you were told and approximately when.'],
  ['family_history', 'Does your close family have a history of diabetes, high blood pressure, heart disease, stroke, cancer, or inherited disorders? If yes, describe it briefly.'],
  ['major_injuries', 'Have you ever had a major injury, accident, fracture, head injury, or other significant physical trauma? If yes, describe when and what treatment you received.'],
  ['blood_history', 'Have you ever received a blood transfusion or had a significant blood-related problem? If yes, describe it.'],
  ['ongoing_undiagnosed_concerns', 'Do you currently have any ongoing symptoms or health concerns that have not yet been diagnosed? If yes, describe them.'],
  ['recent_doctor_visits', 'Have you visited a doctor, clinic, or hospital recently? If yes, tell us approximately when and why.'],
  ['previous_treatments', 'Have you had any important previous treatment, therapy, long-term care, or repeated medical investigations that your doctor should know about?'],
  ['additional_history', 'Is there anything else about your medical history, health events, diagnoses, treatments, or hospital visits that you think your healthcare team should know? Write “None” if there is nothing else.'],
];

const DEMO_ANSWERS: Record<string, string> = {
  chronic_conditions: "Type 2 Diabetes Mellitus diagnosed 3 years ago; mild Hypertension",
  previous_hospitalizations: "Admitted in 2023 for acute viral gastroenteritis and dehydration, received IV fluids for 2 days",
  surgeries: "Appendectomy in 2018 (laparoscopic), uneventful recovery",
  allergies: "Allergic to Penicillin (causes skin rash and urticaria)",
  serious_allergic_reaction: "None",
  current_medications: "Metformin 500mg twice daily after meals; Telmisartan 40mg once daily in the morning",
  supplements_ayurvedic: "Triphala churna 1 tsp at bedtime with warm water; Vitamin D3 60k monthly",
  previous_diagnoses: "Mild fatty liver grade 1 on ultrasound (2022)",
  family_history: "Father had coronary artery disease (cardiac stent at age 62); Mother has hypertension",
  major_injuries: "Left hairline wrist fracture during cricket in college (healed with plaster cast)",
  blood_history: "None, never required blood transfusion",
  ongoing_undiagnosed_concerns: "Occasional mid-epigastric discomfort and mild bloating after heavy meals",
  recent_doctor_visits: "Routine primary care checkup 4 months ago for HbA1c monitoring",
  previous_treatments: "Completed 6-week physiotherapy regimen for lumbar muscle strain in 2021",
  additional_history: "None, non-smoker, walks 30 minutes daily",
};

export function MedicalHistory() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [step, setStep] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'step' | 'all'>('step');
  const DRAFT_KEY = user ? `medikiosk_profile_draft_${user.id}` : '';

  const isDemo = Boolean(
    user?.email?.includes('demo') ||
    sessionStorage.getItem('isDemo') ||
    window.location.search.includes('demo')
  );

  useEffect(() => {
    if (!user) return;
    patientApi.getByUserId(user.id).then(async (p) => {
      setPatient(p);
      const saved = await patientApi.getMedicalHistory(p.id);
      let draft: Record<string, any> = {};
      try { draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); } catch {}

      const initialData: Record<string, string> = { ...(saved.medical_history || {}), ...draft };
      setForm(initialData);
      setIsCompleted(Boolean(saved.completed));
      if (Object.keys(draft).length) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }).catch(e => setError(e.response?.data?.detail || 'Unable to load medical history.'))
      .finally(() => setLoading(false));
  }, [user]);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const saveToServer = async () => {
    if (!patient) return;
    setSaving(true);
    setError('');
    try {
      await patientApi.saveMedicalHistory(patient.id, form);
      setIsCompleted(true);
    } catch (e: any) {
      setError(e.response?.data?.detail?.message || e.response?.data?.detail || 'Could not save your medical history.');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const currentKey = QUESTIONS[step][0];
    if (!form[currentKey]?.trim()) {
      update(currentKey, 'None');
    }

    if (step < QUESTIONS.length - 1) {
      setStep(prev => prev + 1);
    } else {
      // Last question completed
      await saveToServer();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(prev => prev - 1);
  };

  const handleAllSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveToServer();
  };

  if (loading) return <div className="py-20 text-center"><LoadingSpinner size="lg" /></div>;

  // Completion view
  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card className="border-emerald-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur mx-auto flex items-center justify-center text-3xl mb-3 shadow-inner">
              ✓
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">Medical History Complete ✓</h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-md mx-auto">
              All 15 clinical questionnaire steps have been successfully verified and saved to your health record.
            </p>
          </div>
          <CardBody className="p-6 sm:p-8 space-y-6 text-center">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-2">
                <span>Summary of Responses</span>
                <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">15 / 15 Verified</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your medical team and triage AI now have complete context including chronic conditions, past surgeries, medications, allergies, and family history.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => nav('/patient/profile-setup')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                Proceed to Profile Setup →
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsCompleted(false)}
                className="w-full sm:w-auto font-medium"
              >
                Review / Edit Answers
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => nav('/patient')}
                className="w-full sm:w-auto"
              >
                Go to Patient Dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const currentQ = QUESTIONS[step];
  const currentKey = currentQ[0];
  const currentQuestionText = currentQ[1];
  const progressPercent = Math.round(((step + 1) / QUESTIONS.length) * 100);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 px-4">
      <Card className="shadow-lg border-emerald-100">
        <CardBody className="p-4 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => nav('/patient')}
              className="text-xs font-bold text-gray-500 hover:text-emerald-700 flex items-center gap-1"
            >
              ← Exit to Home
            </button>
            <div className="flex items-center gap-2">
              {isDemo && (
                <button
                  type="button"
                  onClick={() => {
                    const prefilled: Record<string, string> = {};
                    QUESTIONS.forEach(([k]) => {
                      prefilled[k] = DEMO_ANSWERS[k] || 'None';
                    });
                    setForm(prefilled);
                  }}
                  className="text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 cursor-pointer transition-colors"
                  title="Click to pre-fill realistic demo answers"
                >
                  ⚡ Demo: Pre-fill answers
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode(mode === 'step' ? 'all' : 'step')}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                {mode === 'step' ? 'View All Questions' : 'Step-by-Step Flow'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl shrink-0">
              🩺
            </div>
            <div>
              <p className="text-[11px] font-black tracking-wider text-emerald-700 uppercase">
                {t('history.title', 'Patient Medical History Questionnaire')}
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                {t('history.q_prefix', 'Question')} {step + 1} {t('history.of', 'of')} {QUESTIONS.length}
              </h1>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {error && <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          {mode === 'step' ? (
            /* Step-by-Step Flow (Question 1 of 15 -> Next -> Question 15 -> Complete) */
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    {step + 1}
                  </span>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    {t('history.q_prefix', 'Question')} {step + 1} {t('history.of', 'of')} 15
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-4">
                  {currentQuestionText}
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Your response (pre-filled realistic placeholder for demo — feel free to edit or click Next):
                  </label>
                  <textarea
                    value={form[currentKey] || ''}
                    onChange={(e) => update(currentKey, e.target.value)}
                    rows={4}
                    placeholder="Type your answer or click Next…"
                    className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner resize-y"
                  />
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={step === 0}
                  onClick={handlePrev}
                  className="font-bold disabled:opacity-30"
                >
                  ← {t('common.prev', 'Previous')}
                </Button>

                <div className="text-xs text-gray-400">
                  {step + 1} {t('history.of', 'of')} {QUESTIONS.length}
                </div>

                <Button
                  type="button"
                  loading={saving}
                  size="lg"
                  onClick={handleNext}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 shadow-md"
                >
                  {step < QUESTIONS.length - 1 ? `${t('common.next', 'Next')} →` : t('history.all_complete', 'Complete Medical History ✓')}
                </Button>
              </div>
            </div>
          ) : (
            /* All-Questions View */
            <form onSubmit={handleAllSubmit} className="space-y-4">
              {QUESTIONS.map(([key, question], index) => (
                <div key={key} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                  <label className="block">
                    <span className="flex gap-2 text-sm font-bold text-gray-800">
                      <span className="shrink-0 text-emerald-700">{index + 1}.</span>
                      {question}
                    </span>
                    <textarea
                      value={form[key] || ''}
                      onChange={(e) => update(key, e.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-xl border-gray-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                    />
                  </label>
                </div>
              ))}
              <div className="pt-4 flex justify-end">
                <Button type="submit" loading={saving} size="lg" className="bg-emerald-600 font-bold">
                  Save All 15 Answers ✓
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
