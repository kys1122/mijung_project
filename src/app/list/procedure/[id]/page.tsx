"use client"

import { Check, ChevronLeft, ChevronRight, ExternalLink, FileText, Volume2, Building2, Coins, ScrollText, Info } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import TopSettings from "../../../components/TopSettings";
import { useTranslations } from '../../../lib/i18n';
import { STRINGS as PROC_STRINGS, type ProcedureStrings } from '../../../lib/strings/procedure';
import { DEFAULT_LANG, isSupported, type LangCode } from '../../../lib/languages';
import { apiFetch, getAccessToken } from '@/lib/api-client';
import BottomNav from '../../../components/BottomNav';
import RichTextRenderer from '../../../components/RichTextRenderer';
import { normalizeOfficialLink } from '@/lib/url';

const ProcedureScreen: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState<any[]>([]);
  const [serviceName, setServiceName] = useState({ ko: "", en: "" });
  const [info, setInfo] = useState<{
    overview: string | null;
    eligibility: string | null;
    ministry: string | null;
    department: string | null;
    fee: string | null;
    official_link: string | null;
  }>({ overview: null, eligibility: null, ministry: null, department: null, fee: null, official_link: null });
  const [loading, setLoading] = useState(true);
  const [llmDetail, setLlmDetail] = useState<string>('');
  const [llmDetailLoading, setLlmDetailLoading] = useState(false);

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
        setInfo({
          overview: data.overview ?? null,
          eligibility: data.eligibility ?? null,
          ministry: data.ministry ?? null,
          department: data.department ?? null,
          fee: data.fee ?? null,
          official_link: data.official_link ?? null,
        });
        if (data.name) {
          setLlmDetailLoading(true);
          try {
            const detRes = await fetch('/api/service-detail', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ service_name: data.name, lang: 'ko', user_type: '' }),
            });
            const detData = await detRes.json();
            if (detData?.detail) setLlmDetail(detData.detail);
          } catch (e) { console.error('service-detail 호출 실패:', e); }
          finally { setLlmDetailLoading(false); }
        }
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

  // 트랙별 진행률 — 공통 단계는 양쪽 트랙에 모두 카운트
  const commonSteps = step.filter((s: any) => s.track === 'common' || !s.track);
  const offlineSteps = step.filter((s: any) => s.track === 'offline');
  const onlineSteps = step.filter((s: any) => s.track === 'online');
  const commonDone = commonSteps.filter((s: any) => s.isCompleted).length;
  const offlineDone = offlineSteps.filter((s: any) => s.isCompleted).length;
  const onlineDone = onlineSteps.filter((s: any) => s.isCompleted).length;

  const offlineTotal = commonSteps.length + offlineSteps.length;
  const onlineTotal = commonSteps.length + onlineSteps.length;
  const offlineTrackDone = commonDone + offlineDone;
  const onlineTrackDone = commonDone + onlineDone;
  const offlinePct = offlineTotal > 0 ? (offlineTrackDone / offlineTotal) * 100 : 0;
  const onlinePct = onlineTotal > 0 ? (onlineTrackDone / onlineTotal) * 100 : 0;

  // 트랙이 한쪽만 있으면 단일 진행률로 폴백
  const showOffline = offlineSteps.length > 0;
  const showOnline = onlineSteps.length > 0;
  const showSplit = showOffline && showOnline;

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
      alert(lang === 'en' ? "Couldn't play audio. Try again in a moment." : '음성 재생에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setTtsLoadingId(null);
    }
  };

  const t = useTranslations<ProcedureStrings>('procedure', PROC_STRINGS as unknown as { ko: ProcedureStrings; en: ProcedureStrings }, lang);

  // 고대비 모드 — 토큰을 덮어쓸 인라인 클래스
  const pageBg = isHighContrast ? 'bg-black' : 'bg-surface-page';
  const cardCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-400' : 'ui-card';
  const cardDoneCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-300' : 'rounded-2xl bg-success/5 border border-emerald-200 ' + 'shadow-[0_2px_8px_rgba(15,23,42,0.05)]';
  const titleColor = isHighContrast ? 'text-white' : 'text-ink-1';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-ink-2';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-ink-3';
  const metaColor = isHighContrast ? 'text-zinc-400' : 'text-ink-4';
  const progressBg = isHighContrast ? 'bg-zinc-700' : 'bg-line-soft';
  const progressFill = isHighContrast ? 'bg-yellow-400' : 'bg-brand-600';
  const ttsBtn = isHighContrast
    ? 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700'
    : 'bg-surface-muted border border-line-base text-ink-2 hover:bg-line-soft';
  const linkBtn = isHighContrast
    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
    : 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_4px_12px_rgba(37,99,235,0.18)]';
  const docsBtn = isHighContrast
    ? 'bg-zinc-900 border-yellow-400 text-yellow-400 hover:bg-zinc-800'
    : 'bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-100/60';
  const checkboxOn = isHighContrast ? 'bg-yellow-400 border-yellow-400' : 'bg-emerald-500 border-emerald-500';
  const checkboxOff = isHighContrast ? 'bg-transparent border-zinc-500' : 'bg-surface border-line-strong';

  const sizeBody = isLargeFont ? 'text-base sm:text-lg' : 'text-sm sm:text-base';
  const sizeStepTitle = isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
  const sizeBtn = isLargeFont ? 'text-lg' : 'text-base';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-8 h-8 border-[3px] ${progressBg} border-t-brand-500 rounded-full animate-spin`} />
          <p className={subtleColor}>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pt-4 pb-28">
        <header className="pt-2 flex items-center justify-between gap-2 ui-enter">
          <button
            onClick={() => router.back()}
            className={`inline-flex items-center gap-1 -ml-2 px-3 py-2 rounded-xl transition-colors hover:bg-black/5 ${titleColor}`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className={`font-medium ${sizeBody}`}>{t.back}</span>
          </button>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <div className="mt-5 ui-enter">
          {(info.ministry || info.department) && (
            <p className={`ui-section-label ${metaColor}`}>
              {info.ministry || info.department}
            </p>
          )}
          <h1 className={`mt-2 ui-page-title ${titleColor}`}>
            {lang === 'en' && serviceName.en ? serviceName.en : serviceName.ko}
          </h1>
        </div>

        {/* 공식 안내 페이지 — '한눈에 보기' 제거 후에도 링크 진입은 유지 */}
        {(() => {
          const officialUrl = normalizeOfficialLink(info.official_link);
          if (!officialUrl) return null;
          return (
            <div className="mt-4 ui-enter">
              <button
                onClick={() => window.open(officialUrl, '_blank', 'noopener,noreferrer')}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold transition-colors ${docsBtn} ${sizeBody}`}
              >
                <ScrollText className="w-4 h-4" />
                {lang === 'en' ? 'Official page' : '공식 안내 페이지'}
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          );
        })()}

        {/* 자세한 안내 */}
        {(llmDetail || llmDetailLoading) && (
          <div className={`mt-4 p-5 sm:p-6 ${cardCls} ui-enter`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex w-8 h-8 rounded-xl ${isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-brand-50 text-brand-600'} items-center justify-center`}>
                <Info className="w-4 h-4" />
              </span>
              <h2 className={`font-bold ${titleColor} ${sizeStepTitle}`}>
                {lang === 'en' ? 'Detailed guide' : '민원 자세히 보기'}
              </h2>
            </div>
            {llmDetailLoading && !llmDetail ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-line-base border-t-brand-500 rounded-full animate-spin" />
                <span className={subtleColor}>{lang === 'en' ? 'Loading detailed guide...' : '자세한 안내를 불러오는 중...'}</span>
              </div>
            ) : (
              <RichTextRenderer text={llmDetail} isHighContrast={isHighContrast} isLargeFont={isLargeFont} />
            )}
          </div>
        )}

        {/* 진행률 — 트랙별 분리 표시 */}
        <div className={`mt-4 p-5 ${cardCls} ui-enter`}>
          <div className="flex items-center justify-between">
            <span className={`font-bold ${titleColor} ${sizeBody}`}>{t.progress}</span>
            {!showSplit && (
              <span className={`font-semibold tabular-nums ${metaColor} ${sizeBody}`}>
                {commonDone + offlineDone + onlineDone}<span className="mx-0.5">/</span>{step.length}
              </span>
            )}
          </div>

          {showSplit ? (
            <div className="mt-3 flex flex-col gap-3">
              {/* 오프라인 트랙 */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${descColor}`}>
                    <Building2 className="w-4 h-4 opacity-70" />
                    {lang === 'en' ? 'Offline' : '오프라인 신청'}
                  </span>
                  <span className={`text-xs font-semibold tabular-nums ${metaColor}`}>
                    {offlineTrackDone}/{offlineTotal}
                  </span>
                </div>
                <div className={`mt-1.5 w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
                    style={{ width: `${offlinePct}%` }}
                  />
                </div>
              </div>
              {/* 온라인 트랙 */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${descColor}`}>
                    <ExternalLink className="w-4 h-4 opacity-70" />
                    {lang === 'en' ? 'Online' : '온라인 신청'}
                  </span>
                  <span className={`text-xs font-semibold tabular-nums ${metaColor}`}>
                    {onlineTrackDone}/{onlineTotal}
                  </span>
                </div>
                <div className={`mt-1.5 w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
                    style={{ width: `${onlinePct}%` }}
                  />
                </div>
              </div>
              <p className={`mt-1 text-xs ${metaColor}`}>
                {lang === 'en'
                  ? 'Common steps count toward both tracks'
                  : '공통 단계(신청 자격 확인)는 두 트랙 모두에 반영돼요'}
              </p>
            </div>
          ) : (
            <div className={`mt-3 w-full h-2.5 rounded-full overflow-hidden ${progressBg}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
                style={{ width: `${step.length > 0 ? ((commonDone + offlineDone + onlineDone) / step.length) * 100 : 0}%` }}
              />
            </div>
          )}

          <button
            onClick={() => router.push(`/list/document/${id}`)}
            className={`mt-4 w-full inline-flex items-center justify-between gap-2 px-4 py-3.5 rounded-2xl font-semibold transition-colors ${docsBtn} ${sizeBody}`}
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t.docs}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 체크리스트 단계 — 트랙별 그룹화 */}
        {(() => {
          const renderStepCard = (s: any, displayNum: number) => (
            <div
              key={s.id}
              className={`relative ${s.isCompleted ? cardDoneCls : cardCls} transition-all`}
            >
              <div className={`absolute -top-3 -left-2 w-10 h-10 flex items-center justify-center rounded-2xl font-bold ${
                s.isCompleted
                  ? (isHighContrast ? 'bg-yellow-400 text-black' : 'bg-emerald-500 text-white')
                  : (isHighContrast ? 'bg-zinc-800 text-yellow-400 border border-yellow-400' : 'bg-brand-600 text-white')
              } shadow-[0_4px_12px_rgba(37,99,235,0.18)]`}>
                {displayNum}
              </div>
              <div className="p-5 pt-7">
                <h2 className={`font-bold ${titleColor} ${sizeStepTitle}`}>{s.title}</h2>
                {s.description && (
                  <p className={`mt-1.5 leading-relaxed ${descColor} ${sizeBody}`}>{s.description}</p>
                )}
                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  {s.link && (
                    <button
                      onClick={() => {
                        const url = s.link.startsWith('http') ? s.link : `https://${s.link}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className={`flex-1 py-3 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${linkBtn} ${sizeBtn}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t.web}
                    </button>
                  )}
                  <button
                    onClick={() => handleSpeak(s)}
                    disabled={ttsLoadingId === s.id}
                    className={`flex-1 py-3 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 ${ttsBtn} ${sizeBtn}`}
                  >
                    <Volume2 className="w-4 h-4" />
                    {ttsLoadingId === s.id ? t.voicePlaying : t.voice}
                  </button>
                </div>
                <button
                  onClick={() => Complete(s.id)}
                  className="mt-5 flex items-center gap-2.5 group"
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-lg border-2 transition-all ${s.isCompleted ? checkboxOn : checkboxOff} group-hover:scale-105`}>
                    {s.isCompleted && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                  </span>
                  <span className={`font-semibold ${titleColor} ${sizeBody}`}>{t.done}</span>
                </button>
              </div>
            </div>
          );

          const TrackHeader = ({ Icon, label }: { Icon: any; label: string }) => (
            <div className="flex items-center gap-2 mt-7 mb-1">
              <span className={`inline-flex w-7 h-7 rounded-xl items-center justify-center ${isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-brand-50 text-brand-600'}`}>
                <Icon className="w-4 h-4" />
              </span>
              <h3 className={`font-bold ${titleColor} ${sizeBody}`}>{label}</h3>
            </div>
          );

          return (
            <div className="mt-6 flex flex-col gap-4">
              {/* 공통 단계 (자격 확인) — 항상 먼저 */}
              {commonSteps.map((s: any, idx: number) => renderStepCard(s, idx + 1))}

              {showSplit ? (
                <>
                  {/* 오프라인 트랙 */}
                  {offlineSteps.length > 0 && (
                    <>
                      <TrackHeader Icon={Building2} label={lang === 'en' ? 'Offline application' : '오프라인으로 신청'} />
                      {offlineSteps.map((s: any, idx: number) => renderStepCard(s, commonSteps.length + idx + 1))}
                    </>
                  )}
                  {/* 온라인 트랙 */}
                  {onlineSteps.length > 0 && (
                    <>
                      <TrackHeader Icon={ExternalLink} label={lang === 'en' ? 'Online application' : '온라인으로 신청'} />
                      {onlineSteps.map((s: any, idx: number) => renderStepCard(s, commonSteps.length + idx + 1))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {offlineSteps.map((s: any, idx: number) => renderStepCard(s, commonSteps.length + idx + 1))}
                  {onlineSteps.map((s: any, idx: number) => renderStepCard(s, commonSteps.length + idx + 1))}
                </>
              )}
            </div>
          );
        })()}
      </div>
      <BottomNav />
    </div>
  )
}

export default ProcedureScreen;
