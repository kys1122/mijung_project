"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, PenSquare, Trash2 } from "lucide-react";
import TopSettings from '../components/TopSettings';
import BottomNav from '../components/BottomNav';
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
  const [unauthorized, setUnauthorized] = useState(false);

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

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(lang === 'en' ? 'Delete this conversation?' : '이 대화를 삭제할까요?')) return;
    try {
      await apiFetch(`/api/chat-sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('삭제 실패:', e); }
  };

  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const cardBg = isHighContrast ? 'bg-zinc-900 border-yellow-400' : 'bg-white border-slate-200/70';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-600';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-slate-600';
  const ctaBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const sizeTitle = isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';
  const sizeSub = isLargeFont ? 'text-lg' : 'text-base';
  const sizeCardTitle = isLargeFont ? 'text-lg' : 'text-base';

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pt-4 pb-28">
        <div className="flex items-start justify-end">
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </div>

        <div className="mt-2">
          <h1 className={`font-bold tracking-tight ${titleColor} ${sizeTitle}`}>
            {lang === 'en' ? 'My Questions' : '내 질문 기록'}
          </h1>
          <p className={`mt-1 ${subtleColor} ${sizeSub}`}>
            {lang === 'en' ? 'Past conversations with the chatbot' : '챗봇과 나눈 대화를 다시 볼 수 있어요'}
          </p>
        </div>

        <button
          onClick={() => router.push('/chat')}
          className={`mt-5 w-full py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm ${ctaBtn} ${sizeSub}`}
        >
          <PenSquare className="w-5 h-5" />
          {lang === 'en' ? 'New chat' : '새 대화 시작'}
        </button>

        {loading ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm">{lang === 'en' ? 'Loading...' : '불러오는 중...'}</p>
          </div>
        ) : unauthorized ? (
          <div className={`mt-12 rounded-2xl border ${cardBg} p-8 text-center`}>
            <p className={`${titleColor} ${sizeCardTitle}`}>
              {lang === 'en' ? 'Login required' : '로그인이 필요해요'}
            </p>
            <button
              onClick={() => router.push('/user/login')}
              className={`mt-5 w-full py-3.5 rounded-xl font-semibold transition-colors ${ctaBtn}`}
            >
              {lang === 'en' ? 'Login' : '로그인하러 가기'}
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className={`mt-8 rounded-2xl border ${cardBg} p-8 text-center`}>
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-blue-500" />
            </div>
            <p className={`mt-4 ${titleColor} ${sizeCardTitle}`}>
              {lang === 'en' ? 'No conversations yet' : '아직 대화가 없어요'}
            </p>
            <p className={`mt-1 ${subtleColor} text-sm`}>
              {lang === 'en' ? 'Ask the chatbot about any civil service' : '챗봇에게 민원에 대해 물어보세요'}
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/chat?session=${s.id}`)}
                className={`group rounded-2xl border shadow-sm hover:shadow-md transition-all p-4 text-left flex items-start gap-3 ${cardBg}`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isHighContrast ? 'bg-zinc-800' : 'bg-blue-50'}`}>
                  <MessageSquare className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${titleColor} ${sizeCardTitle}`}>{s.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={subtleColor}>{timeAgo(s.updated_at, lang)}</span>
                    <span className={subtleColor}>·</span>
                    <span className={subtleColor}>
                      {s.message_count} {lang === 'en' ? 'messages' : '개 메시지'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  className={`shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isHighContrast ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800' : 'text-slate-500 hover:text-red-500 hover:bg-red-50'}`}
                  aria-label="delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default ListScreen;
