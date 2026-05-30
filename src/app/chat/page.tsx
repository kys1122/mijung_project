'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Mic } from 'lucide-react';
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

  // ----- 설정 영속화 -----
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

  // qa에서 저장한 컨텍스트로 user_type 추정 (서버는 한국어 키 기대)
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

        // SSE: "data: {...}\n\n" 단위로 파싱
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
            // 비 JSON chunk
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

  // 스트리밍 실패/빈응답이면 /api/chat 단발 호출
  const fallbackToChat = async (question: string, current: Msg[]) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user_type: userTypeFromContext(),
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

  // ----- 음성 입력 (STT) -----
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

  const themeClass = isHighContrast ? 'bg-black text-white' : 'bg-white text-black';
  const headerBorder = isHighContrast ? 'border-b border-white' : 'border-b-2 border-[#C9C9C9]';
  const inputBg = isHighContrast ? 'bg-black border-white text-white' : 'bg-white border-gray-300 text-black';
  const userBubble = isHighContrast ? 'bg-[#FDC700] text-black' : 'bg-[#009DFF] text-white';
  const botBubble = isHighContrast ? 'bg-zinc-800 text-white border border-[#ffd000]' : 'bg-[#F0F7FF] text-black border border-gray-200';
  const fontSize = isLargeFont ? 'text-[22px]' : 'text-[18px]';

  return (
    <div className={`min-h-screen flex flex-col items-center ${themeClass}`}>
      <div className="w-full max-w-[450px] flex flex-col" style={{ minHeight: '100vh' }}>
        <header className={`relative py-4 px-4 ${headerBorder}`}>
          <button onClick={() => router.back()} className="flex items-center gap-1">
            <ChevronLeft className="w-8 h-8" />
            <span className={`${isLargeFont ? 'text-[24px]' : 'text-[20px]'} font-semibold`}>{t.back}</span>
          </button>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <h1 className={`px-4 pt-3 ${isLargeFont ? 'text-[34px]' : 'text-[28px]'} font-bold`}>{t.title}</h1>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ minHeight: 0 }}>
          {messages.length === 0 && (
            <p className={`opacity-60 ${fontSize}`}>{t.placeholder}</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] px-4 py-3 rounded-2xl ${fontSize} whitespace-pre-wrap leading-snug ${m.role === 'user' ? `${userBubble} self-end` : `${botBubble} self-start`}`}>
              {m.content || (m.role === 'assistant' && sending ? '…' : '')}
            </div>
          ))}
        </div>

        <div className={`p-3 border-t ${isHighContrast ? 'border-white' : 'border-gray-200'} flex gap-2 items-end`}>
          <button
            onClick={isRecording ? stopRec : startRec}
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 text-white' : (isHighContrast ? 'bg-[#FDC700] text-black' : 'bg-[#009DFF] text-white')}`}
            aria-label="voice"
          >
            <Mic className="w-6 h-6" />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t.placeholder}
            rows={1}
            className={`flex-1 resize-none px-3 py-3 rounded-2xl border outline-none ${inputBg} ${fontSize}`}
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className={`shrink-0 h-12 px-4 rounded-2xl font-bold ${isHighContrast ? 'bg-[#FDC700] text-black' : 'bg-[#009DFF] text-white'} disabled:opacity-50`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
