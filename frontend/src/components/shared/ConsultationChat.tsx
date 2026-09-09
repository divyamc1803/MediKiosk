import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { clinicalChatApi } from '../../api/client';
import { ClinicalChatMessage } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

export function ConsultationChat({ consultationId }: { consultationId: string }) {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [messages, setMessages] = useState<ClinicalChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const initialScrollDoneRef = useRef<boolean>(false);

  const isPatientViewer = user?.role === 'PATIENT';
  const preferredLang = isPatientViewer ? language : undefined;

  const scrollToBottomIfNear = (force = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (force || !initialScrollDoneRef.current || isNearBottom) {
      el.scrollTop = el.scrollHeight;
      initialScrollDoneRef.current = true;
    }
  };

  const loadMessages = () => {
    clinicalChatApi.get(consultationId, preferredLang)
      .then((data) => {
        setMessages((prev) => {
          // Avoid triggering re-renders if list hasn't changed
          if (
            prev.length === data.length &&
            prev[prev.length - 1]?.id === data[data.length - 1]?.id &&
            prev[prev.length - 1]?.translated_content === data[data.length - 1]?.translated_content
          ) {
            return prev;
          }
          return data;
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [consultationId, preferredLang]);

  useEffect(() => {
    if (messages.length > 0) {
      const isNewMessage = messages.length > prevMsgCountRef.current;
      if (!initialScrollDoneRef.current || isNewMessage) {
        scrollToBottomIfNear(!initialScrollDoneRef.current);
      }
      prevMsgCountRef.current = messages.length;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);
    try {
      await clinicalChatApi.send(consultationId, trimmed);
      loadMessages();
      setTimeout(() => scrollToBottomIfNear(true), 100);
    } catch (err) {
      console.error('Failed to send clinical chat message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-white border border-emerald-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Chat Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            💬
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              {t('chat.title', 'Doctor ↔ Patient Consultation Chat')}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
                {t('common.connected', 'Connected')}
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              {isPatientViewer
                ? t('chat.patient_sub', 'Directly message your attending physician. Doctor responses are automatically translated.')
                : t('chat.doctor_sub', 'Direct clinical messaging with the patient. Type in English; patient receives in their chosen language.')}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll View - Strictly contained scrolling to prevent page drift */}
      <div ref={scrollContainerRef} className="h-64 sm:h-72 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-sm font-medium">{t('chat.no_messages', 'No consultation messages yet.')}</p>
            <p className="text-xs text-gray-400 mt-0.5">Send a message to start communicating with the {isPatientViewer ? 'doctor' : 'patient'}.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = Boolean(user && m.sender_user_id === user.id);
            const isPatient = m.sender_role === 'PATIENT';
            // Show translated content if patient viewer and sender is doctor
            const displayText = (isPatientViewer && !isPatient && m.translated_content)
              ? m.translated_content
              : m.content;
            const hasTranslation = isPatientViewer && !isPatient && Boolean(m.translated_content && m.translated_content !== m.content);

            return (
              <div
                key={m.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[75%] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm text-sm [overflow-wrap:anywhere] break-words ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      isMe ? 'text-emerald-100' : 'text-teal-700'
                    }`}>
                      {isMe ? `You (${isPatient ? 'Patient' : 'Doctor'})` : (isPatient ? 'Patient' : 'Attending Doctor')}
                    </span>
                    <span className={`text-[9px] ${isMe ? 'text-emerald-200' : 'text-gray-400'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] break-words">{displayText}</p>

                  {hasTranslation && (
                    <div className="mt-1.5 pt-1 border-t border-gray-100 text-[10px] text-gray-400 italic [overflow-wrap:anywhere] break-words">
                      Original: "{m.content}"
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isPatientViewer ? (language === 'hi' ? 'डॉक्टर से सवाल पूछें...' : 'Ask the doctor a question…') : (language === 'hi' ? 'मरीज को सलाह या निर्देश लिखें...' : 'Reply to patient or provide clinical advice…')}
          className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition-colors flex items-center gap-1.5"
        >
          {sending ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <span>{t('chat.send', 'Send')}</span>
              <span className="text-xs">➤</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
