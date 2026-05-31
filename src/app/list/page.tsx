"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, PenSquare, Trash2 } from "lucide-react";
import TopSettings from '../components/TopSettings';
import BottomNav from '../components/BottomNav';
import PageHeader from '../components/PageHeader';
import { useTranslations } from '../lib/i18n';
import { STRINGS as LIST_STRINGS, type ListStrings } from '../lib/strings/list';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
import { apiFetch, getAccessToken } from '@/lib/api-client';

type ChatSession = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

function timeAgo(iso: string, lang: LangCode): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (lang === 'en') {
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString('en-US');
  }
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

const ListScreen: React.FC = () => {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
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
  const handleLang = (val: LangCode) => { setLang(val); localStorage.setItem('app_lang', val); };
  const handleContrast = (val: boolean) => { setIsHighContrast(val); localStorage.setItem('app_contrast', String(val)); };
  const handleFont = (val: boolean) => { setIsLargeFont(val); localStorage.setItem('app_font', String(val)); };

  const t = useTranslations<ListStrings>('list', LIST_STRINGS as unknown as { ko: ListStrings; en: ListStrings }, lang);

  const loadSessions = async () => {
    if (!getAccessToken()) {
      router.replace('/user/login?return=/list');
      return;
    }
    try {
      const res = await apiFetch('/api/chat-sessions');
      if (res.status === 401) {
        router.replace('/user/login?return=/list');
        return;
      }
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (err) {
      console.error('세션 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessions(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleOpen = (id: number) => router.push(`/chat?session=${id}`);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(lang === 'en' ? 'Delete this conversation?' : '이 대화를 삭제할까요?')) return;
    try {
      await apiFetch(`/api/chat-sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('삭제 실패:', e); }
  };

  // 고대비 모드 분기
  const pageBg = isHighContrast ? 'bg-black' : 'bg-surface-page';
  const cardCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-400' : 'ui-card-interactive';
  const titleColor = isHighContrast ? 'text-white' : 'text-ink-1';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-ink-3';
  const metaColor = isHighContrast ? 'text-zinc-500' : 'text-ink-4';
  const iconBg = isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-brand-50 text-brand-600';
  const ctaBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-[0_4px_12px_rgba(37,99,235,0.22)]';

  const sizeSub = isLargeFont ? 'text-lg' : 'text-base';
  const sizeCardTitle = isLargeFont ? 'text-base sm:text-lg' : 'text-sm sm:text-base';

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pb-28">
        <PageHeader
          title={lang === 'en' ? 'My Questions' : '내 질문 기록'}
          subtitle={lang === 'en' ? 'Past conversations with the chatbot' : '챗봇과 나눈 대화를 다시 볼 수 있어요'}
          right={
            <TopSettings
              lang={lang} setLang={handleLang}
              isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
              isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
            />
          }
        />

        <button
          onClick={() => router.push('/chat')}
          className={`mt-6 w-full py-3.5 rounded-2xl font-semibold transition-all flex items-center justify-center gap-1.5 ${ctaBtn} ${sizeSub}`}
        >
          <PenSquare className="w-5 h-5" />
          {lang === 'en' ? 'New chat' : '새 대화 시작'}
        </button>

        {loading ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-ink-3">
            <div className="w-8 h-8 border-[3px] border-line-base border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm">{lang === 'en' ? 'Loading...' : '불러오는 중...'}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className={`mt-10 p-8 text-center ui-enter ${cardCls.replace('ui-card-interactive','ui-card')}`}>
            <div className={`mx-auto w-16 h-16 rounded-full ${iconBg} flex items-center justify-center`}>
              <MessageSquare className="w-7 h-7" />
            </div>
            <p className={`mt-5 text-lg font-semibold ${titleColor}`}>
              {lang === 'en' ? 'No conversations yet' : '아직 대화가 없어요'}
            </p>
            <p className={`mt-1.5 text-sm ${subtleColor}`}>
              {lang === 'en' ? 'Ask the chatbot about any civil service' : '챗봇에게 민원에 대해 물어보세요'}
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3 ui-enter">
            {sessions.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpen(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpen(s.id);
                  }
                }}
                className={`group ${cardCls} p-4 text-left flex items-start gap-3 cursor-pointer`}
              >
                <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${iconBg}`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${titleColor} ${sizeCardTitle}`}>{s.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={metaColor}>{timeAgo(s.updated_at, lang)}</span>
                    <span className={metaColor}>·</span>
                    <span className={metaColor}>
                      {s.message_count} {lang === 'en' ? 'messages' : '개 메시지'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  className={`shrink-0 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity ${isHighContrast ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800' : 'text-ink-4 hover:text-danger hover:bg-danger/10'}`}
                  aria-label={lang === 'en' ? 'Delete conversation' : '대화 삭제'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default ListScreen;
