"use client"

import { Check, ChevronLeft, ExternalLink, Volume2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import TopSettings from "../../../components/TopSettings";
import { useTranslations } from '../../../lib/i18n';
import { STRINGS as PROC_STRINGS, type ProcedureStrings } from '../../../lib/strings/procedure';
import { DEFAULT_LANG, isSupported, type LangCode } from '../../../lib/languages';
import { apiFetch, getAccessToken } from '@/lib/api-client';

const ProcedureScreen : React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState<any[]>([]);
  const [serviceName, setServiceName] = useState({ ko: "", en: "" });
  const [loading, setLoading] = useState(true);

  //모드
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

    // --- 실제 백엔드 데이터 연결 ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/checklist/${id}`);
        const data = await res.json();

        // 백엔드 구조에 맞춰 데이터 세팅
        setStep(data.steps || []);
        setServiceName({
          ko: data.name,
          en: data.nameEn || data.name // 영어 이름이 없으면 한글 이름으로 대체
        });
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  // 진행 단계(checklist) 기록 — 로그인된 사용자만
  useEffect(() => {
    if (!id || !getAccessToken()) return;
    apiFetch(`/api/my-services/${id}/visit`, {
      method: 'POST',
      body: JSON.stringify({ step: 'checklist' }),
    }).catch(err => console.error('visit 기록 실패:', err));
  }, [id]);

  // 진행률 계산 (백엔드에서 가져온 step 배열 기준)
  const completedCount = step.filter((s:any) => s.isCompleted).length;
  const progress = step.length > 0 ? (completedCount / step.length) * 100 : 0;

  // 완료 상태 토글: UI 즉시 반영 후 백엔드에 저장
  const Complete = async (stepId: number) => {
    const target = step.find((s: any) => s.id === stepId);
    if (!target) return;
    const newChecked = !target.isCompleted;
    setStep(prev => prev.map((s: any) => s.id === stepId ? {...s, isCompleted: newChecked} : s));

    if (!getAccessToken()) return; // 비로그인은 UI만 토글
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

  // 음성으로 듣기 (/api/tts)
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

  const themeClass = isHighContrast ? "bg-black text-yellow-400" : "bg-white text-black";
  const themeClass2 = isHighContrast ? "bg-black text-white" : "bg-white text-black";
  const headerBorder = isHighContrast ? "border-b border-white" : "border-b-2 border-[#C9C9C9]";
  const textClass = isHighContrast ? 'text-white' : 'text-black'

  if (loading) return <div className={`min-h-screen flex items-center justify-center ${themeClass2}`}>{t.loading}</div>;

  return(
    <div className={`min-h-screen flex flex-col items-center ${themeClass2}`}>
      <div className="w-full max-w-[450px]">
        <header className={`relative py-4 item-center justify-between ${headerBorder}`}>
          <button
          onClick={() => router.back()}
          className="flex items-center activate:opacity-40 transition-opacity gap-1"
          >
            <ChevronLeft className="w-8 h-8"/>
            <span className={`${isLargeFont ? 'text-[26px]' : 'text-[22px]'} ${themeClass2}`}>{t.back}</span>
          </button>
          <TopSettings 
            lang={lang} setLang={handleLang} 
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast} 
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t} 
          />
        </header>

        <h1 className={`pt-[15px] ${isLargeFont ? 'text-[37px]' : 'text-[33px]'} font-bold`}>{lang === 'en' && serviceName.en ? serviceName.en : serviceName.ko}</h1>
        
        <div className={`mt-[25px] mx-2 pt-[10px] px-5 pb-4 ${isHighContrast ? 'bg-zinc-800 border-2 border-[#ffd000]' : 'bg-[#E9F1FF]'} rounded-[15px]`}>
          <span className={`text-center ${isLargeFont ? 'text-[27px]' : 'text-[23px]'} font-bold block`}>{t.progress}</span>
          <span className={`w-full text-right ${isLargeFont ? 'text-[22px]' : 'text-[18px]'} block -mt-3`}>{completedCount}/{step.length}</span>
          <div className="w-full h-4 bg-white rounded-[20px]">
            <div className={`${isHighContrast ? 'bg-[#ffd207]' : 'bg-[#005EFF]'} h-full transition-all rounded-[20px]`}
                style={{width: `${progress}%`}}/>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={() => router.push(`/list/document/${id}`)}
            className={`mt-[15px] p-[5px] px-[15px] flex items-center border-3 rounded-[15px] text-black ${isHighContrast ? 'border-[#ffd000] bg-[#ffd000]' : 'border-[#0044FF] bg-white'} ${isLargeFont ? 'text-[26px]' : 'text-[22px]'} font-semibold`}
          >
            {t.docs}
          </button>
        </div>

        <div className="flex flex-col gap-10 p-5 mt-15">
          {step.map((step:any) => (
            <div key={step.id} className="relative">
              <div className={`absolute -top-4 -left-2 w-13 h-13 flex items-center justify-center rounded-full ${isHighContrast ? "text-black" : "text-white"} font-bold ${isLargeFont ? 'text-[40px]' : 'text-[36px]'} ${isHighContrast ? (step.isCompleted ? 'bg-[#ffc200]' : 'bg-white') : (step.isCompleted ? 'bg-[#00CA22]' : 'bg-[#009DFF]')}`}>
                {step.id}
              </div>
              <div className={`p-5 pt-8 border-2 rounded-[10px] ${isHighContrast ? (step.isCompleted ? 'border-[#ffdf7e] bg-black' : 'border-white bg-black') : (step.isCompleted ? 'border-[#009C27] bg-[#F4FFF6]' : 'border-[#C9C9C9] bg-white')}`}>
                <h2 className={`mb-4 ${isLargeFont ? 'text-[32px]' : 'text-[28px]'} font-bold ${textClass}`}>{step.title}</h2>
                <p className={`px-3 mb-11 ${isLargeFont ? 'text-[26px]' : 'text-[22px]'} ${textClass}`}>{step.description}</p>
                <div className="flex flex-col">
                  {step.link && (
                    <button
                      onClick={() => {
                        const url = step.link.startsWith('http') ? step.link : `https://${step.link}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className={`mb-2 mx-4.5 py-1.5 flex items-center justify-center bg-[#3F85FF] rounded-[10px] text-white font-bold ${isLargeFont ? 'text-[26px]' : 'text-[22px]'}`}>
                      <ExternalLink className="w-5 h-5"/>
                      {t.web}
                    </button>
                  )}
                  <button
                    onClick={() => handleSpeak(step)}
                    disabled={ttsLoadingId === step.id}
                    className={`mx-4.5 py-1.5 flex items-center justify-center bg-[#E4E4E4] rounded-[10px] font-bold text-black ${isLargeFont ? 'text-[27px]' : 'text-[23px]'} disabled:opacity-60`}>
                    <Volume2 className="w-7 h-7"/>
                    {ttsLoadingId === step.id ? t.voicePlaying : t.voice}
                  </button>

                  <button
                    onClick={() => Complete(step.id)}
                    className="mt-7 flex items-center"
                  >
                    <div className={`w-9 h-9 flex items-center justify-center ${isHighContrast ? (step.isCompleted ? 'bg-[#ffd000]' : 'bg-[#F1F1F1]') : (step.isCompleted ? 'bg-[#00E404]' : 'bg-[#F1F1F1]')}`}>
                      {step.isCompleted && <Check className="text-white w-7 h-7"/>}
                    </div>
                    <span className={`ml-2 text-[24px] font-bold ${textClass}`}>{t.done}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProcedureScreen;