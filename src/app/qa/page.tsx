'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Mic, Sparkles } from 'lucide-react';
import TopSettings from '../components/TopSettings';
import { useTranslations } from '../lib/i18n';
import { STRINGS as QA_STRINGS, type QaStrings } from '../lib/strings/qa';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';

const ALLOWED_NEXT = new Set(['/chat', '/recommend', '/list', '/dashboard']);

type Option = { label: string; value: string; next_id?: number | null };
type Question = {
  id: number;
  question_text: string;
  answer_options: Option[] | null;
  next_module: string | null;
  sort_order?: number;
};

export default function QaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const nextPath = nextParam && ALLOWED_NEXT.has(nextParam) ? nextParam : '/recommend';

  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);

  const [rootQuestions, setRootQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<Array<{ q: Question; answer: string }>>([]);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>('');
  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') ?? '';
    const savedContrast = localStorage.getItem('app_contrast') === 'true';
    const savedFont = localStorage.getItem('app_font') === 'true';
    if (isSupported(savedLang)) setLang(savedLang);
    if (savedContrast) setIsHighContrast(savedContrast);
    if (savedFont) setIsLargeFont(savedFont);
  }, []);
  const handleLang = (newLang: LangCode) => { setLang(newLang); localStorage.setItem('app_lang', newLang); };
  const handleContrast = (val: boolean) => { setIsHighContrast(val); localStorage.setItem('app_contrast', String(val)); };
  const handleFont = (val: boolean) => { setIsLargeFont(val); localStorage.setItem('app_font', String(val)); };

  const t = useTranslations<QaStrings>('qa', QA_STRINGS as unknown as { ko: QaStrings; en: QaStrings }, lang);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 1) 루트 질문 받아서 첫 질문(sort_order=1) 표시
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/qa/start?lang=${lang}`);
        const data = await res.json();
        const qs: Question[] = data?.questions ?? [];
        setRootQuestions(qs);
        const first = qs.find(q => q.sort_order === 1) ?? qs[0];
        if (first) setCurrentQ(first);
      } catch (e) { console.error('questions/start 실패:', e); }
      finally { setLoading(false); }
    })();
  }, [lang]);

  const canProceed = () => {
    if (!currentQ) return false;
    if (currentQ.answer_options && currentQ.answer_options.length > 0) return !!selected;
    return true; // free text 질문은 비어도 진행 가능
  };

  const submitClassify = async (finalAnswers: Record<string, string>, sid: number | null) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/qa/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: finalAnswers, session_id: sid }),
      });
      const data = await res.json();
      // 챗봇 /classify 응답 형식이 정확히 어떤지에 따라 약간 다를 수 있음
      // 핵심은 matched_services 같은 배열을 localStorage에 저장
      const matched = data?.matched_services ?? data?.services ?? data?.results ?? [];
      const payload = {
        matched_services: matched,
        summary: data?.summary ?? data?.explanation ?? '',
        answers: finalAnswers,
        session_id: sid,
      };
      localStorage.setItem('analyze_result', JSON.stringify(payload));
      localStorage.setItem('final_context', JSON.stringify({ answers: finalAnswers, lang, submitted_at: new Date().toISOString() }));
    } catch (e) { console.error('classify 실패:', e); }
    router.push(nextPath);
  };

  const handleNext = async () => {
    if (!currentQ || !canProceed() || submitting) return;
    const value = currentQ.answer_options && currentQ.answer_options.length > 0 ? selected : freeText.trim();

    const newAnswers = { ...answers, [String(currentQ.id)]: value };
    setAnswers(newAnswers);
    setHistory(prev => [...prev, { q: currentQ, answer: value }]);

    // free_chat 진입점이면 그냥 chat으로 보냄
    if (currentQ.next_module === 'free_chat') {
      localStorage.setItem('final_context', JSON.stringify({ answers: newAnswers, lang, submitted_at: new Date().toISOString() }));
      router.push('/chat');
      return;
    }

    try {
      const res = await fetch('/api/qa/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQ.id,
          answer_value: value,
          session_id: sessionId,
          lang,
        }),
      });
      const data = await res.json();
      if (data?.session_id) setSessionId(data.session_id);

      if (data?.done) {
        // classify 호출 후 다음 경로로
        const merged = data.answers ?? newAnswers;
        await submitClassify(merged, data.session_id ?? sessionId);
        return;
      }
      if (data?.next_question) {
        setCurrentQ(data.next_question);
        setSelected('');
        setFreeText('');
      } else {
        // 다음 질문 없으면 classify 시도
        await submitClassify(newAnswers, data?.session_id ?? sessionId);
      }
    } catch (e) {
      console.error('answer 호출 실패:', e);
      alert(lang === 'en'
        ? 'Connection lost. Please try again in a moment.'
        : '연결이 끊겼어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handlePrev = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentQ(last.q);
    const newAns = { ...answers };
    delete newAns[String(last.q.id)];
    setAnswers(newAns);
    setSelected(last.answer);
    setFreeText('');
  };

  // 첫 화면에 루트 질문 직접 골라 시작
  const startWithRoot = (q: Question) => {
    setCurrentQ(q);
    setHistory([]);
    setAnswers({});
    setSelected('');
    setFreeText('');
  };

  const handleStartVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.wav');
        formData.append('language', lang);
        try {
          const r = await fetch('/api/stt', { method: 'POST', body: formData });
          const data = await r.json();
          if (data.text) setFreeText(prev => (prev ? prev + ' ' : '') + data.text);
        } catch (e) { console.error('STT 실패:', e); }
        finally { setIsVoiceModalOpen(false); }
      };
      recorder.start();
      setIsVoiceModalOpen(true);
    } catch { alert('마이크 권한을 허용해주세요.'); }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // --- 디자인 토큰 ---
  const pageBg = isHighContrast ? 'bg-black' : 'bg-surface-page';
  const cardCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-400' : 'ui-card';
  const titleColor = isHighContrast ? 'text-white' : 'text-ink-1';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-ink-3';
  const inputBg = isHighContrast ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-surface border-line-base text-ink-1';
  const ctaBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-[0_4px_12px_rgba(37,99,235,0.22)]';
  const secondaryBtn = isHighContrast
    ? 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white'
    : 'bg-surface border border-line-base hover:bg-surface-muted text-ink-2';
  const optionBase = isHighContrast
    ? 'border-zinc-700 hover:bg-zinc-800'
    : 'border-line-soft hover:bg-brand-50';
  const optionActive = isHighContrast
    ? 'border-yellow-400 bg-zinc-800'
    : 'border-brand-500 bg-brand-50';
  const progressBg = isHighContrast ? 'bg-zinc-800' : 'bg-line-soft';
  const progressFill = isHighContrast ? 'bg-yellow-400' : 'bg-brand-600';

  const sizeStepTitle = isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';
  const sizeBody = isLargeFont ? 'text-lg' : 'text-base';
  const sizeOption = isLargeFont ? 'text-lg' : 'text-base';

  const stepIdx = history.length;
  // 트리 깊이를 모르므로 진행률은 단순 카운트 (최대 6단계 가정)
  const progressPercent = Math.min(((stepIdx + 1) / 6) * 100, 100);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-8 h-8 border-3 ${progressBg} border-t-blue-500 rounded-full animate-spin`}></div>
          <p className={subtleColor}>{lang === 'en' ? 'Loading...' : '불러오는 중...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg} flex flex-col`}>
      <div className="mx-auto w-full max-w-md sm:max-w-xl px-5 sm:px-8 pt-4 pb-6 flex flex-col flex-1">
        <header className="flex items-center justify-between gap-2">
          {history.length > 0 ? (
            <button
              onClick={handlePrev}
              className={`flex items-center gap-1 -ml-2 p-2 rounded-lg hover:bg-black/5 transition-colors ${titleColor}`}
            >
              <ChevronLeft className="w-6 h-6" />
              <span className={sizeBody}>{lang === 'en' ? 'Back' : '이전'}</span>
            </button>
          ) : (
            <div />
          )}
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`font-semibold ${subtleColor} ${sizeBody}`}>
              {lang === 'en' ? `Question ${stepIdx + 1}` : `${stepIdx + 1}번째 질문`}
            </span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
            <div className={`h-full rounded-full transition-all duration-300 ${progressFill}`} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* 루트 질문 선택 화면 (처음 진입 시) */}
        {stepIdx === 0 && currentQ && rootQuestions.length > 1 && !answers[String(currentQ.id)] && (
          <div className="mt-4 flex flex-wrap gap-2">
            {rootQuestions.map((q) => (
              <button
                key={q.id}
                onClick={() => startWithRoot(q)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  currentQ?.id === q.id
                    ? (isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white')
                    : (isHighContrast ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
                }`}
              >
                {q.question_text.slice(0, 20)}{q.question_text.length > 20 ? '…' : ''}
              </button>
            ))}
          </div>
        )}

        <main className={`mt-6 flex-1 rounded-2xl border shadow-sm p-6 sm:p-8 ${cardCls}`}>
          {currentQ ? (
            <>
              <h1 className={`font-bold tracking-tight ${titleColor} ${sizeStepTitle}`}>
                {currentQ.question_text}
              </h1>

              {currentQ.answer_options && currentQ.answer_options.length > 0 ? (
                <div className="mt-6 flex flex-col gap-2.5">
                  {currentQ.answer_options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelected(opt.value)}
                      className={`w-full px-5 py-4 rounded-xl border-2 text-left font-semibold transition-colors ${
                        selected === opt.value ? optionActive : optionBase
                      } ${titleColor} ${sizeOption}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  <textarea
                    placeholder={lang === 'en' ? 'Type your question...' : '궁금한 점을 자유롭게 적어주세요.'}
                    className={`w-full h-32 p-4 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeOption}`}
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                  />
                  <button
                    onClick={handleStartVoice}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${secondaryBtn} ${sizeBody}`}
                  >
                    <Mic className="w-4 h-4" />
                    {t.btnVoice}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className={subtleColor}>{lang === 'en' ? 'No questions available' : '표시할 질문이 없습니다'}</p>
          )}
        </main>

        <div className="mt-5">
          <button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className={`w-full py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${ctaBtn} ${isLargeFont ? 'text-xl' : 'text-lg'}`}
          >
            {submitting ? (
              <>
                <Sparkles className="w-5 h-5 animate-pulse" />
                {lang === 'en' ? 'Finding services...' : '맞춤 민원 찾는 중...'}
              </>
            ) : (
              <>
                {lang === 'en' ? 'Next' : '다음'}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {isVoiceModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-[300] p-6">
          <div className="flex flex-col items-center gap-8">
            <div className="w-56 h-56 bg-white rounded-full flex flex-col items-center justify-center shadow-2xl">
              <Mic className="w-16 h-16 text-blue-600 animate-pulse" />
              <p className="mt-3 text-xl font-bold text-slate-900">{t.voiceMain}</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={stopRecording}
                className="px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg transition-colors"
              >
                {t.voiceSubmit}
              </button>
              <button onClick={() => setIsVoiceModalOpen(false)} className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
