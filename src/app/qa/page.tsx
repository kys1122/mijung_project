'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, ChevronDown, Sparkles, X } from 'lucide-react';
import TopSettings from '../components/TopSettings';
import ChatFab from '../components/ChatFab';
import { useTranslations } from '../lib/i18n';
import { STRINGS as QA_STRINGS, type QaStrings } from '../lib/strings/qa';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
import { COMMON_VISAS, normalizeVisa } from '../lib/visa';

export default function QaPage() {
  const router = useRouter();

  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [selections, setSelections] = useState({ type: '', age: '', service: '', detail: '', visa_type: '' });
  const [visaOtherText, setVisaOtherText] = useState('');
  const [visaMode, setVisaMode] = useState<'select' | 'other'>('select');
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'age' | 'service' | null>(null);
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

  const handleSelect = (category: string, value: string) => {
    setSelections(prev => ({ ...prev, [category]: value }));
    setIsSelectModalOpen(false);
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

  const handleSubmit = async () => {
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
    router.push('/list');
  };

  // --- 디자인 토큰 ---
  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const cardBg = isHighContrast ? 'bg-zinc-900 border-yellow-400' : 'bg-white border-slate-200/70';
  const inputBg = isHighContrast ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const labelColor = isHighContrast ? 'text-zinc-300' : 'text-slate-600';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-500';
  const ctaBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const secondaryBtn = isHighContrast
    ? 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white'
    : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700';
  const accent = isHighContrast ? 'accent-yellow-400' : 'accent-blue-600';

  const sizeTitle = isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';
  const sizeBody = isLargeFont ? 'text-lg' : 'text-base';
  const sizeSection = isLargeFont ? 'text-xl' : 'text-lg';

  return (
    <div className={`min-h-screen ${pageBg} relative`}>
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pt-4 pb-24">
        <div className="flex items-start justify-end">
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </div>

        <div className="mt-2">
          <h1 className={`font-bold tracking-tight ${titleColor} ${sizeTitle}`}>{t.title}</h1>
          <p className={`mt-1 font-medium ${subtleColor} ${sizeBody}`}>{t.step}</p>
        </div>

        <main className="mt-6 flex flex-col gap-4">
          {/* 유형 */}
          <section className={`rounded-2xl border shadow-sm p-5 ${cardBg}`}>
            <div className="flex items-baseline gap-2">
              <span className={`font-bold ${titleColor} ${sizeSection}`}>{t.q1}</span>
              <span className={`font-semibold ${labelColor} ${sizeBody}`}>{t.q1_text}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {t.types.map((option: string) => (
                <label
                  key={option}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                    selections.type === option
                      ? (isHighContrast ? 'border-yellow-400 bg-zinc-800' : 'border-blue-500 bg-blue-50')
                      : (isHighContrast ? 'border-zinc-700 hover:bg-zinc-800' : 'border-slate-200 hover:bg-slate-50')
                  }`}
                >
                  <input
                    type="radio" name="type" className={`w-5 h-5 ${accent}`}
                    checked={selections.type === option}
                    onChange={() => handleSelect('type', option)}
                  />
                  <span className={`font-semibold ${titleColor} ${sizeBody}`}>{option}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 비자 (외국인) */}
          {(selections.type === '외국인' || selections.type === 'Foreigner') && (
            <section className={`rounded-2xl border shadow-sm p-5 ${cardBg}`}>
              <div className="flex items-baseline gap-2">
                <span className={`font-bold ${titleColor} ${sizeSection}`}>1-1.</span>
                <span className={`font-semibold ${labelColor} ${sizeBody}`}>{lang === 'ko' ? '비자 종류는?' : 'Visa type?'}</span>
              </div>
              <select
                value={visaMode === 'other' ? 'OTHER' : selections.visa_type}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'OTHER') {
                    setVisaMode('other');
                    setSelections((p) => ({ ...p, visa_type: visaOtherText }));
                  } else {
                    setVisaMode('select');
                    setSelections((p) => ({ ...p, visa_type: v }));
                  }
                }}
                className={`mt-3 w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeBody}`}
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
                    setSelections((p) => ({ ...p, visa_type: normalizeVisa(e.target.value) }));
                  }}
                  placeholder={lang === 'ko' ? '예: G-1, A-2' : 'e.g. G-1, A-2'}
                  className={`mt-3 w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeBody}`}
                />
              )}
            </section>
          )}

          {/* 연령 / 서비스 */}
          {[
            { id: 'age', q: t.q2, txt: t.q2_text, ph: t.agePlaceholder },
            { id: 'service', q: t.q3, txt: t.q3_text, ph: t.servicePlaceholder },
          ].map((item) => (
            <section key={item.id} className={`rounded-2xl border shadow-sm p-5 ${cardBg}`}>
              <div className="flex items-baseline gap-2">
                <span className={`font-bold ${titleColor} ${sizeSection}`}>{item.q}</span>
                <span className={`font-semibold ${labelColor} ${sizeBody}`}>{item.txt}</span>
              </div>
              <button
                type="button"
                onClick={() => { setModalType(item.id as any); setIsSelectModalOpen(true); }}
                className={`mt-3 w-full px-4 py-3 rounded-xl border flex items-center justify-between font-medium transition-colors ${inputBg} ${sizeBody}`}
              >
                <span className={(selections as any)[item.id] ? titleColor : subtleColor}>
                  {(selections as any)[item.id] || item.ph}
                </span>
                <ChevronDown className={`w-5 h-5 ${subtleColor}`} />
              </button>
            </section>
          ))}

          {/* 상황 입력 */}
          <section className={`rounded-2xl border shadow-sm p-5 ${cardBg}`}>
            <div className="flex items-baseline gap-2">
              <span className={`font-bold ${titleColor} ${sizeSection}`}>{t.q4}</span>
              <span className={`font-semibold ${labelColor} ${sizeBody}`}>{t.q4_text}</span>
            </div>
            <textarea
              placeholder={t.textareaPlaceholder}
              className={`mt-3 w-full h-28 p-4 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeBody}`}
              value={selections.detail}
              onChange={(e) => setSelections({ ...selections, detail: e.target.value })}
            />
            <button
              onClick={handleStartVoice}
              className={`mt-3 w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${secondaryBtn} ${sizeBody}`}
            >
              <Mic className="w-4 h-4" />
              {t.btnVoice}
            </button>
          </section>

          <button
            onClick={handleSubmit}
            className={`mt-2 w-full py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-md ${ctaBtn} ${isLargeFont ? 'text-xl' : 'text-lg'}`}
          >
            <Sparkles className="w-5 h-5" />
            {t.btnSubmit}
          </button>
        </main>
      </div>

      {/* 옵션 선택 모달 */}
      {isSelectModalOpen && modalType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{modalType === 'age' ? t.modalAge : t.modalService}</h3>
              <button onClick={() => setIsSelectModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {t.options[modalType].map((item: string) => (
                <li key={item}>
                  <button
                    onClick={() => handleSelect(modalType, item)}
                    className="w-full px-5 py-3.5 text-left text-base text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
            <div className="p-3">
              <button
                onClick={() => setIsSelectModalOpen(false)}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatFab isHighContrast={isHighContrast} label={lang === 'ko' ? '챗봇' : 'Chat'} />

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
