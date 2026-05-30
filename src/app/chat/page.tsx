'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Mic, Sparkles } from 'lucide-react';
import TopSettings from '../components/TopSettings';
import { useTranslations } from '../lib/i18n';
import { STRINGS as CHAT_STRINGS, type ChatStrings } from '../lib/strings/chat';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const router = useRouter();
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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

  const sessionId = (() => {
    if (typeof window === 'undefined') return undefined;
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) {
      sid = `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      localStorage.setItem('chat_session_id', sid);
    }
    return sid;
  })();

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: text }, { role: 'assistant', content: '' }];
    setMessages(next);
    setSending(true);

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
          session_id: sessionId,
        }),
      });

      if (!res.ok || !res.body) {
        await fallbackToChat(text, next);
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

      if (!acc) await fallbackToChat(text, next);
    } catch (e) {
      console.error('chat stream error:', e);
      await fallbackToChat(text, next);
    } finally {
      setSending(false);
    }
  };

  const fallbackToChat = async (question: string, current: Msg[]) => {
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
          session_id: sessionId,
        }),
      });
      const data = await res.json();
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: data.answer ?? data.error ?? t.failResponse
        };
        return copy;
      });
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
  const micBtn = isRecording
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : (isHighContrast ? 'bg-zinc-800 hover:bg-zinc-700 text-yellow-400' : 'bg-white border border-slate-200 hover:bg-slate-100 text-blue-600');

  const sizeBubble = isLargeFont ? 'text-lg' : 'text-base';
  const sizeTitle = isLargeFont ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl';
  const sizeBack = isLargeFont ? 'text-lg' : 'text-base';

  return (
    <div className={`fixed inset-0 flex flex-col ${pageBg}`}>
      <div className={`mx-auto w-full max-w-md sm:max-w-2xl flex flex-col h-full`}>
        <header className={`px-5 sm:px-8 py-3 border-b ${headerBorder} flex items-center justify-between gap-2`}>
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-1 -ml-2 p-2 rounded-lg hover:bg-black/5 transition-colors ${titleColor}`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className={`font-medium ${sizeBack}`}>{t.back}</span>
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
    </div>
  );
}
