import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { patientApi, consultationApi, conversationApi, ambulanceApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTranslation } from '../../hooks/useTranslation';
import type { ConversationMessage, RedFlag } from '../../types';

interface SessionInfo {
  id: string;
  consultation_id: string;
  state: string;
  language_code: string;
}

interface QuestionState {
  text: string;
  options: string[];
  state: string;
  /** The MAIN question index (1–15). Follow-ups keep the same index as the parent main question. */
  question_index: number;
  total_questions: number;
  is_follow_up: boolean;
}

/**
 * Single authoritative progress formula:
 *   progress % = (question_index / 15) * 100
 *
 * This is the ONLY place the percentage is computed.
 * It is used for both the numeric label and the CSS width.
 */
function calcProgress(questionIndex: number): number {
  return (Math.min(15, Math.max(1, questionIndex)) / 15) * 100;
}

export function AIInterview() {
  const { user } = useAuth();
  // Use the global language context as the single source of truth for language
  const { language, t } = useTranslation();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [redFlags, setRedFlags] = useState<any[]>([]);

  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emergencyDispatching, setEmergencyDispatching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  // Keep a ref to the session so event handlers always have the latest value
  const sessionRef = useRef<SessionInfo | null>(null);
  sessionRef.current = session;

  // Track the last language sent to the backend to avoid redundant API calls
  const lastSyncedLangRef = useRef<string>('');

  // ── Speech Recognition ────────────────────────────────────────────────
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = ({
        en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN',
        ta: 'ta-IN', te: 'te-IN', gu: 'gu-IN', kn: 'kn-IN',
        ml: 'ml-IN', pa: 'pa-IN',
      } as any)[language] || 'hi-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setTextInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  // ── Language change → update session language on backend ──────────────
  useEffect(() => {
    const currentSession = sessionRef.current;
    // Only call the API if:
    // 1. There is an active, non-completed session
    // 2. The language actually differs from what we last synced
    // 3. The session hasn't been completed yet
    if (!currentSession?.id || isCompleted) return;
    if (language === lastSyncedLangRef.current) return;

    lastSyncedLangRef.current = language;

    conversationApi.updateLanguage(currentSession.id, language)
      .then((res) => {
        if (res?.current_question) {
          const aiQ = res.current_question;
          const qIdx = aiQ.question_index ?? 1;
          setCurrentQuestion({
            text: (aiQ as any).question_text || (aiQ as any).question || '',
            options: (aiQ as any).options || [],
            state: (aiQ as any).state,
            question_index: qIdx,
            total_questions: 15,
            is_follow_up: Boolean((aiQ as any).is_follow_up),
          });
        }
      })
      .catch((e) => {
        console.warn('Could not update session language on server', e);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, isCompleted]);
  // NOTE: intentionally omitting session from deps — we access it via sessionRef.current

  // ── Session Initialisation ────────────────────────────────────────────
  const initSession = useCallback(async (forceRestart: boolean = false) => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Get patient record
      const pat = await patientApi.getByUserId(user.id);

      // 2. Find active consultation or create one
      const consultations = await patientApi.getConsultations(pat.id);
      let cons = consultations.find((x: any) => x.status !== 'COMPLETED');
      if (!cons) {
        cons = await consultationApi.create({ patient_id: pat.id });
      }

      // 3. Start or resume conversation session — use global language as source of truth
      const lang = language || pat.preferred_language || 'en';
      const sessResponse: any = await conversationApi.start(cons.id, lang, forceRestart);

      const newSession: SessionInfo = {
        id: sessResponse.id,
        consultation_id: sessResponse.consultation_id,
        state: sessResponse.state || 'Q1_CHIEF_COMPLAINT',
        language_code: sessResponse.language_code || lang,
      };
      setSession(newSession);
      sessionRef.current = newSession;
      // Mark the language as already synced so we don't double-call updateLanguage
      lastSyncedLangRef.current = lang;

      // 4. Restore transcript (on refresh)
      if (!forceRestart) {
        try {
          const transcript = await conversationApi.getTranscript(sessResponse.id);
          setMessages(transcript && transcript.length > 0 ? transcript : []);
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }

      // 5. Display the current question
      if (sessResponse.initial_question) {
        const initQ = sessResponse.initial_question;
        const qIdx = initQ.question_index ?? 1;

        if (initQ.state === 'COMPLETE') {
          setIsCompleted(true);
        } else {
          setIsCompleted(false);
          setCurrentQuestion({
            text: initQ.question_text || initQ.question || '',
            options: initQ.options || [],
            state: initQ.state,
            question_index: qIdx,
            total_questions: 15,
            is_follow_up: Boolean(initQ.is_follow_up),
          });
        }
      }

    } catch (err: any) {
      console.error('Failed to initialize session', err);
      setError('Failed to start interview. Please try again.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, language]);

  useEffect(() => {
    initSession(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentQuestion]);

  // ── Send Answer ───────────────────────────────────────────────────────
  const handleSend = async (type: 'TEXT' | 'OPTION' = 'TEXT', content?: string) => {
    const val = content || textInput.trim();
    if (!val && type !== 'OPTION') return;
    if (!session || isCompleted) return;

    setProcessing(true);
    setTextInput('');
    if (isListening && recognitionRef.current) recognitionRef.current.stop();

    try {
      // Add patient message to UI immediately
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        session_id: session.id,
        role: 'PATIENT' as any,
        content: val,
        message_type: type as any,
        selected_option: type === 'OPTION' ? val : undefined,
        timestamp: new Date().toISOString(),
      } as any]);

      const res = await conversationApi.sendMessage(session.id, {
        content: val,
        message_type: type,
        selected_option: type === 'OPTION' ? val : undefined,
      });

      const aiQ: any = res.ai_response;
      // question_index from backend is the authoritative value
      const qIdx = aiQ.question_index ?? 1;

      setCurrentQuestion({
        text: aiQ.question_text || aiQ.question || '',
        options: aiQ.options || [],
        state: aiQ.state,
        question_index: qIdx,
        total_questions: 15,
        is_follow_up: Boolean(aiQ.is_follow_up),
      });

      if (aiQ.red_flags && aiQ.red_flags.length > 0) {
        setRedFlags(aiQ.red_flags);
        setShowEmergency(true);
      }

      if (aiQ.state === 'COMPLETE') {
        setIsCompleted(true);
        await conversationApi.complete(session.id);
      }

    } catch (err) {
      console.error(err);
      setError('Failed to send response. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ── Emergency Ambulance ───────────────────────────────────────────────
  const dispatchGovernmentAmbulance = async () => {
    if (!user || emergencyDispatching) return;
    setEmergencyDispatching(true);
    try {
      const pat = await patientApi.getByUserId(user.id);
      const hospitals = await ambulanceApi.getHospitals();
      const gov = hospitals.filter((h: any) => h.is_government && h.emergency_dept);
      if (!gov.length) throw new Error('No government emergency hospital is configured');
      const loc = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 3000 });
      });
      const lat = loc?.coords.latitude ?? 26.8530;
      const lng = loc?.coords.longitude ?? 75.8050;
      const dest = gov[0];
      const req = await ambulanceApi.emergencyRequest({
        patient_id: pat.id, pickup_lat: lat, pickup_lng: lng,
        pickup_address: 'Current patient location',
        destination_lat: dest.lat, destination_lng: dest.lng,
        destination_address: dest.address, destination_hospital_id: dest.id,
        ambulance_type_requested: 'ALS', priority: 'CRITICAL',
      });
      setShowEmergency(false);
      navigate('/patient/ambulance', { state: { priority: 'CRITICAL', redFlags, requestId: req.id } });
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || 'Government ambulance could not be dispatched.');
    } finally {
      setEmergencyDispatching(false);
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please type instead.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTextInput('');
      recognitionRef.current.start();
    }
  };

  // ── Derived progress values ───────────────────────────────────────────
  // ONE formula, used everywhere. No rounding here so CSS width is smooth.
  // When currentQuestion is null (still loading), use 0 so the bar starts
  // empty and never shows a false 6.67% before the real index arrives.
  const currentIdx = isCompleted ? 15 : (currentQuestion?.question_index ?? 0);
  // progressValue is the raw float (e.g. 6.666... for Q1). Zero when loading.
  const progressValue = isCompleted ? 100 : (currentIdx === 0 ? 0 : calcProgress(currentIdx));
  // progressLabel: hide until we have a real question
  const progressLabel = isCompleted ? '100' : (currentIdx === 0 ? '0' : progressValue.toFixed(1).replace('.0', ''));
  // CSS width uses the exact float so it never jumps artificially
  const sliderWidthCSS = `${progressValue.toFixed(4)}%`;

  const questionTitle = isCompleted
    ? (language === 'hi' ? 'स्वास्थ्य सर्वेक्षण पूर्ण · 15/15' : 'Intake Complete · 15 of 15')
    : (language === 'hi'
      ? `प्रश्न ${currentIdx} / 15`
      : `Question ${currentIdx} of 15`
    );

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="py-20 text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-500">Initializing AI Interview...</p>
    </div>
  );

  if (error && !session) return (
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Could not start interview</h2>
      <p className="text-gray-500 mb-6">{error}</p>
      <Button onClick={() => initSession(true)}>Retry Fresh</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">

      {/* ── Progress Bar Header — Single Source of Truth ── */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 shrink-0">
        <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-2">
          <div className="flex items-center gap-2">
            <span className="bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[11px]">
              {language.toUpperCase()}
            </span>
            <span className="text-gray-900 font-extrabold text-sm sm:text-base">
              {questionTitle}
            </span>
            {currentQuestion?.is_follow_up && !isCompleted && (
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200">
                {language === 'hi' ? 'स्पष्टीकरण प्रश्न' : 'Clinical Clarification'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-teal-700 font-black">
              {progressLabel}% {t('common.complete', 'Complete')}
            </span>
            <button
              onClick={() => initSession(true)}
              className="text-[11px] text-gray-500 hover:text-red-600 underline font-medium transition-colors"
              title="Restart from Question 1"
            >
              {language === 'hi' ? 'पुनः शुरू करें' : 'Start Over'}
            </button>
          </div>
        </div>

        {/* Progress Slider — width driven by single calcProgress() value, never by message count or timers */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className="bg-teal-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: sliderWidthCSS }}
          />
        </div>
      </div>

      <div className="px-4 py-2 text-[11px] bg-amber-50 text-amber-800 border-b border-amber-100 flex justify-between items-center">
        <span>
          {t('ai.safety', 'Safety: AI assistant records clinical history for doctor review. It does not prescribe medicines.')}
        </span>
        <span className="font-mono text-[10px] text-amber-700">15 Questions</span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'AI' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              msg.role === 'AI'
                ? 'bg-gray-100 text-gray-800 rounded-tl-sm font-medium'
                : 'bg-teal-600 text-white rounded-tr-sm font-medium'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Active Question — ONE question displayed at a time */}
        {currentQuestion && !processing && !isCompleted && (
          <div className="flex justify-start">
            <div className="max-w-[92%] md:max-w-[85%] bg-emerald-50/90 border-2 border-emerald-200 p-5 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                  {questionTitle}
                </span>
                {currentQuestion.is_follow_up && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    Follow-up
                  </span>
                )}
              </div>
              <p className="text-lg md:text-xl font-bold text-gray-900 mb-4 leading-snug">
                {currentQuestion.text}
              </p>

              {currentQuestion.options && currentQuestion.options.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {currentQuestion.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleSend('OPTION', opt)}
                      className="w-full text-left px-4 py-3 bg-white border border-emerald-200 rounded-xl text-emerald-800 font-bold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors shadow-xs"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion Banner */}
        {isCompleted && (
          <div className="p-6 bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-300 rounded-2xl text-center space-y-4 shadow-sm my-4">
            <div className="w-16 h-16 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-3xl mx-auto font-black shadow-sm">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-black text-teal-950">
                {language === 'hi' ? 'चिकित्सा इतिहास सफलतापूर्वक दर्ज किया गया' : 'Clinical Intake Completed'}
              </h3>
              <p className="text-sm text-teal-800 mt-1 max-w-md mx-auto">
                {language === 'hi'
                  ? 'आपके सभी 15 प्रश्नों के उत्तर सुरक्षित रूप से दर्ज कर लिए गए हैं। आपका केस अब डॉक्टर की समीक्षा के लिए तैयार (READY) है।'
                  : 'All 15 questions have been completed. Your consultation is now marked READY for clinician review.'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button onClick={() => navigate('/patient/profile')}>
                {language === 'hi' ? 'स्वास्थ्य प्रोफ़ाइल देखें' : 'View Clinical Profile'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/patient/home')}>
                {language === 'hi' ? 'होमपेज पर जाएं' : 'Back to Dashboard'}
              </Button>
              <Button variant="ghost" onClick={() => initSession(true)}>
                {language === 'hi' ? 'पुनः सर्वेक्षण शुरू करें' : 'Restart Intake'}
              </Button>
            </div>
          </div>
        )}

        {processing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center h-12 shadow-xs">
              <div className="w-2.5 h-2.5 bg-teal-600 rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2.5 h-2.5 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        )}

        {error && session && (
          <div className="text-center">
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg inline-block">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isCompleted && (
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={toggleListen}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all shadow-sm flex-shrink-0 ${
                isListening ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
              }`}
              title="Voice Input"
            >
              🎙️
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && textInput.trim()) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isListening
                    ? (language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...')
                    : (language === 'hi' ? 'अपना उत्तर यहाँ लिखें...' : 'Type your answer...')
                }
                disabled={processing}
                className="w-full h-14 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!textInput.trim() || processing}
              className="w-14 h-14 bg-teal-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors shrink-0 shadow-sm"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      <Modal isOpen={showEmergency} onClose={() => setShowEmergency(false)} size="lg" showClose={false}>
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-pulse">
            🚨
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('ai.urgent_title', 'Urgent Medical Attention Advised')}</h2>
          <p className="text-gray-600 mb-6">
            {t('ai.urgent_desc', 'Based on your responses, you may be experiencing a medical emergency. Do you need an ambulance immediately?')}
          </p>
          <div className="bg-red-50 rounded-lg p-4 mb-8 text-left border border-red-100">
            <p className="font-semibold text-red-800 mb-2">{t('ai.detected_symptoms', 'Detected Symptoms:')}</p>
            <ul className="list-disc list-inside text-red-700 text-sm">
              {redFlags.map((flag, i) => <li key={i}>{(flag.keyword || '').toUpperCase()}</li>)}
            </ul>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="danger"
              size="lg"
              className="w-full text-lg shadow-lg shadow-red-200"
              onClick={dispatchGovernmentAmbulance}
            >
              🚑 {emergencyDispatching ? t('ai.calling_ambulance', 'CALLING GOVERNMENT AMBULANCE…') : t('ai.call_ambulance', 'CALL GOVERNMENT AMBULANCE')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-red-600 text-red-600 hover:bg-red-50"
              onClick={() => setShowEmergency(false)}
            >
              {t('ai.contact_staff', 'Contact Hospital Staff')}
            </Button>
          </div>
          <button
            className="mt-6 text-sm text-gray-500 underline hover:text-gray-700"
            onClick={() => setShowEmergency(false)}
          >
            {t('ai.continue_anyway', 'I am fine, continue interview')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
