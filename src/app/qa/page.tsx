'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Mic, Sparkles, X } from 'lucide-react';
import TopSettings from '../components/TopSettings';
import { useTranslations } from '../lib/i18n';
import { STRINGS as QA_STRINGS, type QaStrings } from '../lib/strings/qa';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
import { COMMON_VISAS, normalizeVisa } from '../lib/visa';

const ALLOWED_NEXT = new Set(['/chat', '/recommend', '/list', '/dashboard']);

type StepKey = 'type' | 'visa' | 'age' | 'service' | 'detail';

export default function QaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const nextPath = nextParam && ALLOWED_NEXT.has(nextParam) ? nextParam : '/recommend';

  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [selections, setSelections] = useState({ type: '', age: '', service: '', detail: '', visa_type: '' });
  const [visaOtherText, setVisaOtherText] = useState('');
  const [visaMode, setVisaMode] = useState<'select' | 'other'>('select');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = useTranslations<QaStrings>('qa', QA_STRINGS as unknown as { ko: QaStrings; en: QaStrings }, lang);

  const handleStartVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await uploadVoice(audioBlob);
      };
      recorder.start();
      setIsVoiceModalOpen(true);
    } catch (err) { alert("마이크 권한을 허용해 주세요."); }
  };
  const uploadVoice = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'voice.wav');
    formData.append('language', lang);
    try {
      const response = await fetch('/api/stt', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.text) setSelections(prev => ({ ...prev, detail: data.text }));
    } catch (e) { console.error("STT 전송 실패:", e); }
    finally { setIsVoiceModalOpen(false); }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const mapUserType = (t: string): string => {
    if (t.includes('외국인') || t.toLowerCase().includes('foreigner')) return '외국인';
    if (t.includes('노인') || t.toLowerCase().includes('senior')) return '노인/고령자';
    if (t.includes('저소득') || t.toLowerCase().includes('low')) return '저소득층';
    return '해당없음';
  };
  const mapAgeGroup = (a: string): string => {
    if (!a) return '';
    if (/^\d+대/.test(a) || a.includes('이상')) return a;
    const m = a.match(/(\d+)/);
    if (!m) return '';
    return parseInt(m[1], 10) >= 60 ? '60대 이상' : `${m[1]}대`;
  };
  const mapCategory = (s: string): string => {
    if (!s) return '';
    const map: Record<string, string> = {
      '민원': '민원서류', '복지': '복지', '주거': '주거', '의료': '의료', '일자리': '',
      'Civil Service': '민원서류', Welfare: '복지', Housing: '주거', Medical: '의료', Jobs: '',
    };
    return s in map ? map[s] : s;
  };

  const isForeigner = selections.type === '외국인' || selections.type === 'Foreigner';
  const steps: StepKey[] = isForeigner
    ? ['type', 'visa', 'age', 'service', 'detail']
    : ['type', 'age', 'service', 'detail'];
  const currentStep = steps[stepIdx];
  const totalSteps = steps.length;

  const canProceed = (() => {
    switch (currentStep) {
      case 'type':    return !!selections.type;
      case 'visa':    return true; // 선택 안 해도 진행 가능
      case 'age':     return !!selections.age;
      case 'service': return !!selections.service;
      case 'detail':  return true;
      default:        return false;
    }
  })();

  const handleNext = () => {
    if (!canProceed) return;
    if (stepIdx < totalSteps - 1) setStepIdx(stepIdx + 1);
    else handleSubmit();
  };
  const handlePrev = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const userContext = { ...selections, lang, submitted_at: new Date().toISOString() };
    localStorage.setItem('final_context', JSON.stringify(userContext));
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: mapUserType(selections.type),
          age_group: mapAgeGroup(selections.age),
          category: mapCategory(selections.service),
          detail: selections.detail,
          lang,
          visa_type: selections.visa_type ? normalizeVisa(selections.visa_type) : ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('analyze_result', JSON.stringify(data));
      }
    } catch (e) { console.error('analyze 호출 실패:', e); }
    router.push(nextPath);
  };

  // --- 디자인 토큰 ---
  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const cardBg = isHighContrast ? 'bg-zinc-900 border-yellow-400' : 'bg-white border-slate-200/70';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const labelColor = isHighContrast ? 'text-zinc-300' : 'text-slate-600';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = isHighContrast ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900';
  const ctaBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const secondaryBtn = isHighContrast
    ? 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white'
    : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700';
  const optionBase = isHighContrast
    ? 'border-zinc-700 hover:bg-zinc-800'
    : 'border-slate-200 hover:bg-slate-50';
  const optionActive = isHighContrast
    ? 'border-yellow-400 bg-zinc-800'
    : 'border-blue-500 bg-blue-50';
  const progressBg = isHighContrast ? 'bg-zinc-800' : 'bg-slate-200';
  const progressFill = isHighContrast ? 'bg-yellow-400' : 'bg-blue-600';

  const sizeStepTitle = isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';
  const sizeBody = isLargeFont ? 'text-lg' : 'text-base';
  const sizeOption = isLargeFont ? 'text-lg' : 'text-base';

  const stepLabel: Record<StepKey, { ko: string; en: string }> = {
    type:    { ko: '어떤 분이세요?', en: 'Who are you?' },
    visa:    { ko: '비자 종류는?', en: 'What is your visa?' },
    age:     { ko: '연령대는?', en: 'Age group?' },
    service: { ko: '어떤 민원을 도와드릴까요?', en: 'What kind of service?' },
    detail:  { ko: '구체적으로 어떤 상황인가요?', en: 'Tell us your situation' },
  };

  return (
    <div className={`min-h-screen ${pageBg} flex flex-col`}>
      <div className="mx-auto w-full max-w-md sm:max-w-xl px-5 sm:px-8 pt-4 pb-6 flex flex-col flex-1">
        <header className="flex items-center justify-between gap-2">
          {stepIdx > 0 ? (
            <button
              onClick={handlePrev}
              className={`flex items-center gap-1 -ml-2 p-2 rounded-lg hover:bg-black/5 transition-colors ${titleColor}`}
            >
              <ChevronLeft className="w-6 h-6" />
              <span className={sizeBody}>{lang === 'en' ? 'Back' : '이전'}</span>
            </button>
          ) : (
            <div /> /* spacer */
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
              {lang === 'en' ? `Step ${stepIdx + 1} of ${totalSteps}` : `${stepIdx + 1} / ${totalSteps} 단계`}
            </span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressFill}`}
              style={{ width: `${((stepIdx + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <main className={`mt-8 flex-1 rounded-2xl border shadow-sm p-6 sm:p-8 ${cardBg}`}>
          <h1 className={`font-bold tracking-tight ${titleColor} ${sizeStepTitle}`}>
            {stepLabel[currentStep][lang === 'en' ? 'en' : 'ko']}
          </h1>

          {currentStep === 'type' && (
            <div className="mt-6 flex flex-col gap-2.5">
              {t.types.map((opt: string) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelections(p => ({ ...p, type: opt }))}
                  className={`w-full px-5 py-4 rounded-xl border-2 text-left font-semibold transition-colors ${
                    selections.type === opt ? optionActive : optionBase
                  } ${titleColor} ${sizeOption}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentStep === 'visa' && (
            <div className="mt-6 flex flex-col gap-3">
              <p className={`${subtleColor} ${sizeBody}`}>
                {lang === 'en' ? 'Optional — pick one or skip.' : '해당 비자가 있으면 선택해주세요. 없으면 건너뛰어도 됩니다.'}
              </p>
              <select
                value={visaMode === 'other' ? 'OTHER' : selections.visa_type}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'OTHER') {
                    setVisaMode('other');
                    setSelections(p => ({ ...p, visa_type: visaOtherText }));
                  } else {
                    setVisaMode('select');
                    setSelections(p => ({ ...p, visa_type: v }));
                  }
                }}
                className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeOption}`}
              >
                {COMMON_VISAS.map((v) => (
                  <option key={v.code || 'none'} value={v.code}>
                    {lang === 'ko' ? v.label_ko : v.label_en}
                  </option>
                ))}
              </select>
              {visaMode === 'other' && (
                <input
                  type="text"
                  value={visaOtherText}
                  onChange={(e) => {
                    setVisaOtherText(e.target.value);
                    setSelections(p => ({ ...p, visa_type: normalizeVisa(e.target.value) }));
                  }}
                  placeholder={lang === 'ko' ? '예: G-1, A-2' : 'e.g. G-1, A-2'}
                  className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeOption}`}
                />
              )}
            </div>
          )}

          {currentStep === 'age' && (
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {t.options.age.map((opt: string) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelections(p => ({ ...p, age: opt }))}
                  className={`px-4 py-4 rounded-xl border-2 font-semibold transition-colors ${
                    selections.age === opt ? optionActive : optionBase
                  } ${titleColor} ${sizeOption}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentStep === 'service' && (
            <div className="mt-6 flex flex-col gap-2.5">
              {t.options.service.map((opt: string) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelections(p => ({ ...p, service: opt }))}
                  className={`w-full px-5 py-4 rounded-xl border-2 text-left font-semibold transition-colors ${
                    selections.service === opt ? optionActive : optionBase
                  } ${titleColor} ${sizeOption}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentStep === 'detail' && (
            <div className="mt-6 flex flex-col gap-3">
              <p className={`${subtleColor} ${sizeBody}`}>
                {lang === 'en' ? 'Optional — describe your situation, or skip.' : '없으면 건너뛰어도 됩니다.'}
              </p>
              <textarea
                placeholder={t.textareaPlaceholder}
                className={`w-full h-32 p-4 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeOption}`}
                value={selections.detail}
                onChange={(e) => setSelections({ ...selections, detail: e.target.value })}
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
        </main>

        <div className="mt-5">
          <button
            onClick={handleNext}
            disabled={!canProceed || submitting}
            className={`w-full py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${ctaBtn} ${isLargeFont ? 'text-xl' : 'text-lg'}`}
          >
            {stepIdx === totalSteps - 1 ? (
              <>
                <Sparkles className="w-5 h-5" />
                {submitting
                  ? (lang === 'en' ? 'Analyzing...' : '분석 중...')
                  : (lang === 'en' ? 'Done' : '완료')}
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
