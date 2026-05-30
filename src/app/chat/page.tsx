'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Mic, Sparkles, PenSquare } from 'lucide-react';
import TopSettings from '../components/TopSettings';
import BottomNav from '../components/BottomNav';
import { useTranslations } from '../lib/i18n';
import { STRINGS as CHAT_STRINGS, type ChatStrings } from '../lib/strings/chat';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
import { apiFetch, getAccessToken } from '@/lib/api-client';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') ?? '';
    const savedContrast = localStorage.getItem('app_contrast') === 'true';
    const savedFont = localStorage.getItem('app_font') === 'true';
    if (isSupported(savedLang)) setLang(savedLang);
    if (savedContrast) setIsHighContrast(savedContrast);
    if (savedFont) setIsLargeFont(savedFont);
  }, []);
  const handleLang = (v: LangCode) => { setLang(v); localStorage.setItem('app_lang', v); };
  const handleContrast = (v: boolean) => { setIsHighContrast(v); localStorage.setItem('app_contrast', String(v)); };
  const handleFont = (v: boolean) => { setIsLargeFont(v); localStorage.setItem('app_font', String(v)); };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const t = useTranslations<ChatStrings>('chat', CHAT_STRINGS as unknown as { ko: ChatStrings; en: ChatStrings }, lang);

  // URL의 ?session=... 이 있으면 그 세션 로드
  useEffect(() => {
    if (!sessionParam) { setSessionId(null); setMessages([]); return; }
    const sid = Number(sessionParam);
    if (!Number.isInteger(sid) || sid <= 0) return;
    if (!getAccessToken()) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/chat-sessions/${sid}`);
        if (!res.ok) return;
        const data = await res.json();
        setSessionId(data.session.id);
        setMessages((data.messages ?? []).map((m: any) => ({ role: m.role, content: m.content })));
      } catch (e) { console.error('세션 로드 실패:', e); }
    })();
  }, [sessionParam]);

  const userTypeFromContext = (): string => {
    try {
      const ctx = JSON.parse(localStorage.getItem('final_context') ?? 'null');
      if (!ctx) return '';
      const t = String(ctx.type ?? '');
      if (t.includes('외국인') || /foreigner/i.test(t)) return '외국인';
      if (t.includes('노인') || /senior/i.test(t)) return '노인/고령자';
      if (t.includes('저소득') || /low/i.test(t)) return '저소득층';
    } catch {}
    return '';
  };
  const visaFromContext = (): string => {
    try {
      const ctx = JSON.parse(localStorage.getItem('final_context') ?? 'null');
      if (ctx && typeof ctx.visa_type === 'string') return ctx.visa_type;
    } catch {}
    return '';
  };

  const externalSessionId = (() => {
    if (typeof window === 'undefined') return undefined;
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) {
      sid = `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      localStorage.setItem('chat_session_id', sid);
    }
    return sid;
  })();

  // 로그인 사용자만, 현재 세션이 없으면 생성해서 ID 반환
  const ensureSession = async (): Promise<number | null> => {
    if (!getAccessToken()) return null;
    if (sessionId) return sessionId;
    try {
      const res = await apiFetch('/api/chat-sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data?.success && data.session?.id) {
        setSessionId(data.session.id);
        return data.session.id;
      }
    } catch (e) { console.error('세션 생성 실패:', e); }
    return null;
  };

  const saveMessage = async (sid: number, role: 'user' | 'assistant', content: string) => {
    try {
      await apiFetch(`/api/chat-sessions/${sid}/messages`, {
        method: 'POST',
        body: JSON.stringify({ role, content }),
      });
    } catch (e) { console.error('메시지 저장 실패:', e); }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setInput('');
    router.replace('/chat');
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: text }, { role: 'assistant', content: '' }];
    setMessages(next);
    setSending(true);

    // 로그인 사용자: 세션 보장 + user 메시지 저장
    const sid = await ensureSession();
    if (sid) await saveMessage(sid, 'user', text);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          user_type: userTypeFromContext(),
          visa_type: visaFromContext(),
          lang,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          session_id: externalSessionId,
        }),
      });

      if (!res.ok || !res.body) {
        await fallbackToChat(text, next, sid);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const raw = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 2);
          if (!raw.startsWith('data:')) continue;
          const payload = raw.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            const chunk = obj.chunk ?? obj.delta ?? obj.text ?? '';
            if (chunk) {
              acc += chunk;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: acc };
                return copy;
              });
            }
          } catch {
            acc += payload;
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'assistant', content: acc };
              return copy;
            });
          }
        }
      }

      if (!acc) {
        await fallbackToChat(text, next, sid);
      } else if (sid) {
        await saveMessage(sid, 'assistant', acc);
      }
    } catch (e) {
      console.error('chat stream error:', e);
      await fallbackToChat(text, next, sid);
    } finally {
      setSending(false);
    }
  };

  const fallbackToChat = async (question: string, current: Msg[], sid: number | null) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user_type: userTypeFromContext(),
          visa_type: visaFromContext(),
          lang,
          history: current.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          session_id: externalSessionId,
        }),
      });
      const data = await res.json();
      const answer = data.answer ?? data.error ?? t.failResponse;
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: answer };
        return copy;
      });
      if (sid && answer) await saveMessage(sid, 'assistant', String(answer));
    } catch (e) {
      console.error('chat fallback error:', e);
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: t.failServer };
        return copy;
      });
    }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const fd = new FormData();
        fd.append('file', blob, 'voice.wav');
        fd.append('language', lang);
        try {
          const r = await fetch('/api/stt', { method: 'POST', body: fd });
          const data = await r.json();
          if (data.text) setInput(prev => (prev ? prev + ' ' : '') + data.text);
        } catch (e) { console.error('STT 실패:', e); }
      };
      rec.start();
      setIsRecording(true);
    } catch { alert(t.micPermission); }
  };
  const stopRec = () => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== 'inactive') r.stop();
    setIsRecording(false);
  };

  // --- 디자인 토큰 ---
  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const headerBorder = isHighContrast ? 'border-zinc-700' : 'border-slate-200/70';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = isHighContrast ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900';
  const userBubble = isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white';
  const botBubble = isHighContrast ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-800';
  const sendBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const newChatBtn = isHighContrast
    ? 'text-yellow-400 hover:bg-zinc-800'
    : 'text-blue-600 hover:bg-blue-50';
  const micBtn = isRecording
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : (isHighContrast ? 'bg-zinc-800 hover:bg-zinc-700 text-yellow-400' : 'bg-white border border-slate-200 hover:bg-slate-100 text-blue-600');

  const sizeBubble = isLargeFont ? 'text-lg' : 'text-base';
  const sizeTitle = isLargeFont ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl';

  return (
    <div className={`fixed inset-x-0 top-0 bottom-16 flex flex-col ${pageBg}`}>
      <div className={`mx-auto w-full max-w-md sm:max-w-2xl flex flex-col h-full`}>
        <header className={`px-5 sm:px-8 py-3 border-b ${headerBorder} flex items-center justify-between gap-2`}>
          <button
            onClick={handleNewChat}
            className={`flex items-center gap-1.5 -ml-2 px-3 py-2 rounded-lg transition-colors ${newChatBtn}`}
            aria-label="새 대화"
          >
            <PenSquare className="w-5 h-5" />
            <span className="font-medium">{lang === 'en' ? 'New chat' : '새 대화'}</span>
          </button>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <div className={`px-5 sm:px-8 pt-4 pb-2 ${titleColor}`}>
          <h1 className={`font-bold tracking-tight ${sizeTitle}`}>{t.title}</h1>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && (
            <div className={`mt-12 flex flex-col items-center text-center ${subtleColor}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isHighContrast ? 'bg-zinc-800' : 'bg-blue-50'}`}>
                <Sparkles className={`w-7 h-7 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
              </div>
              <p className={`mt-4 ${sizeBubble}`}>{t.placeholder}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${sizeBubble} ${
                m.role === 'user' ? `${userBubble} self-end rounded-tr-md` : `${botBubble} self-start rounded-tl-md border`
              }`}
            >
              {m.content || (m.role === 'assistant' && sending ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </span>
              ) : '')}
            </div>
          ))}
        </div>

        <div className={`px-5 sm:px-8 py-3 border-t ${headerBorder}`}>
          <div className="flex items-end gap-2">
            <button
              onClick={isRecording ? stopRec : startRec}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors shadow-sm ${micBtn}`}
              aria-label="voice"
            >
              <Mic className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={t.placeholder}
              rows={1}
              className={`flex-1 resize-none px-4 py-2.5 rounded-2xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all ${inputBg} ${sizeBubble}`}
              disabled={sending}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${sendBtn}`}
              aria-label="send"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
