"use client"

import { Check, ChevronLeft, ExternalLink, FileText, Volume2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import TopSettings from "../../../components/TopSettings";
import { useTranslations } from '../../../lib/i18n';
import { STRINGS as PROC_STRINGS, type ProcedureStrings } from '../../../lib/strings/procedure';
import { DEFAULT_LANG, isSupported, type LangCode } from '../../../lib/languages';
import { apiFetch, getAccessToken } from '@/lib/api-client';
import BottomNav from '../../../components/BottomNav';

const ProcedureScreen: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState<any[]>([]);
  const [serviceName, setServiceName] = useState({ ko: "", en: "" });
  const [loading, setLoading] = useState(true);

  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/checklist/${id}`);
        const data = await res.json();
        setStep(data.steps || []);
        setServiceName({
          ko: data.name,
          en: data.nameEn || data.name
        });
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (!id || !getAccessToken()) return;
    apiFetch(`/api/my-services/${id}/visit`, {
      method: 'POST',
      body: JSON.stringify({ step: 'checklist' }),
    }).catch(err => console.error('visit 기록 실패:', err));
  }, [id]);

  const completedCount = step.filter((s: any) => s.isCompleted).length;
  const progress = step.length > 0 ? (completedCount / step.length) * 100 : 0;

  const Complete = async (stepId: number) => {
    const target = step.find((s: any) => s.id === stepId);
    if (!target) return;
    const newChecked = !target.isCompleted;
    setStep(prev => prev.map((s: any) => s.id === stepId ? { ...s, isCompleted: newChecked } : s));

    if (!getAccessToken()) return;
    try {
      const res = await apiFetch(`/api/checklist/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ item_id: `step_${stepId}`, checked: newChecked }),
      });
      if (!res.ok) throw new Error(`progress ${res.status}`);
    } catch (err) {
      console.error('진행도 저장 실패:', err);
    }
  };

  const [ttsLoadingId, setTtsLoadingId] = useState<number | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const handleSpeak = async (s: any) => {
    const text = `${s.title}. ${s.description ?? ''}`.trim();
    if (!text) return;
    try {
      setTtsLoadingId(s.id);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' })
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      console.error('TTS 실패:', e);
      alert('음성 재생에 실패했습니다.');
    } finally {
      setTtsLoadingId(null);
    }
  };

  const t = useTranslations<ProcedureStrings>('procedure', PROC_STRINGS as unknown as { ko: ProcedureStrings; en: ProcedureStrings }, lang);

  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const cardBg = isHighContrast ? 'bg-zinc-900 border-yellow-400' : 'bg-white border-slate-200/70';
  const cardDone = isHighContrast ? 'bg-zinc-900 border-yellow-300' : 'bg-emerald-50 border-emerald-200';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-slate-600';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-500';
  const progressBg = isHighContrast ? 'bg-zinc-700' : 'bg-slate-200';
  const progressFill = isHighContrast ? 'bg-yellow-400' : 'bg-blue-600';
  const ttsBtn = isHighContrast
    ? 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700'
    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200';
  const linkBtn = isHighContrast
    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
    : 'bg-blue-600 text-white hover:bg-blue-700';
  const docsBtn = isHighContrast
    ? 'bg-zinc-900 border-yellow-400 text-yellow-400 hover:bg-zinc-800'
    : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50';
  const checkboxOn = isHighContrast ? 'bg-yellow-400 border-yellow-400' : 'bg-emerald-500 border-emerald-500';
  const checkboxOff = isHighContrast ? 'bg-transparent border-zinc-500' : 'bg-white border-slate-300';

  const sizeTitle = isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';
  const sizeBody = isLargeFont ? 'text-base sm:text-lg' : 'text-sm sm:text-base';
  const sizeStepTitle = isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
  const sizeBtn = isLargeFont ? 'text-lg' : 'text-base';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-8 h-8 border-3 ${progressBg} border-t-blue-500 rounded-full animate-spin`}></div>
          <p className={subtleColor}>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pt-4 pb-28">
        <header className="flex items-center justify-between gap-2">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-1 -ml-2 p-2 rounded-lg hover:bg-black/5 transition-colors ${titleColor}`}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className={sizeBody}>{t.back}</span>
          </button>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <h1 className={`mt-4 font-bold tracking-tight ${titleColor} ${sizeTitle}`}>
          {lang === 'en' && serviceName.en ? serviceName.en : serviceName.ko}
        </h1>

        <div className={`mt-5 rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${titleColor} ${sizeBody}`}>{t.progress}</span>
            <span className={`font-medium ${subtleColor} ${sizeBody}`}>
              {completedCount}/{step.length}
            </span>
          </div>
          <div className={`mt-3 w-full h-2.5 rounded-full overflow-hidden ${progressBg}`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressFill}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => router.push(`/list/document/${id}`)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 font-semibold transition-colors ${docsBtn} ${sizeBody}`}
          >
            <FileText className="w-4 h-4" />
            {t.docs}
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {step.map((s: any) => (
            <div
              key={s.id}
              className={`relative rounded-2xl border shadow-sm transition-all ${s.isCompleted ? cardDone : cardBg}`}
            >
              <div className={`absolute -top-3 -left-2 w-10 h-10 flex items-center justify-center rounded-full font-bold shadow-sm ${
                s.isCompleted
                  ? (isHighContrast ? 'bg-yellow-400 text-black' : 'bg-emerald-500 text-white')
                  : (isHighContrast ? 'bg-zinc-800 text-yellow-400 border border-yellow-400' : 'bg-blue-600 text-white')
              }`}>
                {s.id}
              </div>
              <div className="p-5 pt-6">
                <h2 className={`mb-2 font-bold ${titleColor} ${sizeStepTitle}`}>{s.title}</h2>
                <p className={`leading-relaxed ${descColor} ${sizeBody}`}>{s.description}</p>

                <div className="mt-5 flex flex-col gap-2">
                  {s.link && (
                    <button
                      onClick={() => {
                        const url = s.link.startsWith('http') ? s.link : `https://${s.link}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className={`w-full py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${linkBtn} ${sizeBtn}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t.web}
                    </button>
                  )}
                  <button
                    onClick={() => handleSpeak(s)}
                    disabled={ttsLoadingId === s.id}
                    className={`w-full py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 ${ttsBtn} ${sizeBtn}`}
                  >
                    <Volume2 className="w-4 h-4" />
                    {ttsLoadingId === s.id ? t.voicePlaying : t.voice}
                  </button>
                </div>

                <button
                  onClick={() => Complete(s.id)}
                  className="mt-5 flex items-center gap-2"
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-md border-2 transition-colors ${s.isCompleted ? checkboxOn : checkboxOff}`}>
                    {s.isCompleted && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                  </span>
                  <span className={`font-semibold ${titleColor} ${sizeBody}`}>{t.done}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default ProcedureScreen;
