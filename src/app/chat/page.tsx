'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Mic, Sparkles, PenSquare, History, ChevronRight, ClipboardList } from 'lucide-react';
import TopSettings from '../components/TopSettings';
import BottomNav from '../components/BottomNav';
import { useTranslations } from '../lib/i18n';
import { STRINGS as CHAT_STRINGS, type ChatStrings } from '../lib/strings/chat';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
import { apiFetch, getAccessToken } from '@/lib/api-client';

type Option = { label: string; value: string; next_id?: number | null };
type Question = {
  id: number;
  question_text: string;
  answer_options: Option[] | null;
  next_module: string | null;
  sort_order?: number;
};
type Service = { service_name: string; agency?: string; eligibility?: string };

type Msg =
  | { kind: 'text'; role: 'user' | 'assistant'; content: string }
  | { kind: 'options'; role: 'assistant'; question: Question }
  | { kind: 'cards'; role: 'assistant'; intro: string; services: Service[] }
  | { kind: 'detail'; role: 'assistant'; serviceName: string; content: string }
  | { kind: 'checklist'; role: 'assistant'; serviceName: string; content: string }
  | { kind: 'thinking'; role: 'assistant' };

type Stage = 'qa' | 'classify' | 'service' | 'freechat';

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
  const [stage, setStage] = useState<Stage>('qa');
  const [qaSessionId, setQaSessionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initRef = useRef(false);

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

  // 외부 세션 ID (챗봇 백엔드용)
  const externalSessionId = (() => {
    if (typeof window === 'undefined') return undefined;
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) { sid = `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`; localStorage.setItem('chat_session_id', sid); }
    return sid;
  })();

  // --- 진입 시 첫 질문 자동 로드 ---
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      // ?session=<id>면 기존 챗 세션 복원 — 단계 흐름 건너뛰고 freechat
      if (sessionParam) {
        const sid = Number(sessionParam);
        if (Number.isInteger(sid) && sid > 0 && getAccessToken()) {
          try {
            const res = await apiFetch(`/api/chat-sessions/${sid}`);
            if (res.ok) {
              const data = await res.json();
              setChatSessionId(data.session.id);
              const restored: Msg[] = (data.messages ?? []).map((m: any) => ({
                kind: 'text' as const,
                role: m.role,
                content: m.content,
              }));
              setMessages(restored);
              setStage('freechat');
              return;
            }
          } catch (e) { console.error('세션 로드 실패:', e); }
        }
      }
      // 신규 진입 — 첫 질문 받기
      await loadFirstQuestion();
    })();
  }, [sessionParam]);

  const loadFirstQuestion = async () => {
    try {
      const res = await fetch(`/api/qa/start?lang=${lang}`);
      const data = await res.json();
      const qs: Question[] = data?.questions ?? [];
      const first = qs.find(q => q.sort_order === 1) ?? qs[0];
      if (first) {
        setMessages([
          { kind: 'text', role: 'assistant', content: lang === 'en' ? "Hello! I'll find services that match your situation. Please answer a few questions." : '안녕하세요! 맞춤 민원을 찾아드릴게요. 몇 가지 여쭤볼게요.' },
          { kind: 'options', role: 'assistant', question: first },
        ]);
        setStage('qa');
      }
    } catch (e) { console.error('questions/start 실패:', e); }
  };

  // --- 옵션 선택 핸들러 ---
  const pickOption = async (q: Question, opt: Option) => {
    if (sending) return;
    setSending(true);

    // 사용자 메시지로 라벨 표시
    setMessages(prev => [...prev, { kind: 'text', role: 'user', content: opt.label }, { kind: 'thinking', role: 'assistant' }]);

    const newAnswers = { ...answers, [String(q.id)]: opt.value };
    setAnswers(newAnswers);

    try {
      const res = await fetch('/api/qa/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: q.id, answer_value: opt.value, session_id: qaSessionId, lang }),
      });
      const data = await res.json();
      if (data?.session_id) setQaSessionId(data.session_id);

      // thinking 제거
      setMessages(prev => prev.filter(m => m.kind !== 'thinking'));

      if (data?.done) {
        const merged = data.answers ?? newAnswers;
        await runClassify(merged, data?.session_id ?? qaSessionId);
        return;
      }
      if (data?.next_question) {
        const next: Question = data.next_question;
        setMessages(prev => [...prev, { kind: 'options', role: 'assistant', question: next }]);
      }
    } catch (e) {
      console.error('answer 호출 실패:', e);
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), { kind: 'text', role: 'assistant', content: t.failServer }]);
    } finally {
      setSending(false);
    }
  };

  // --- /classify 호출 → 후보 카드 표시 ---
  const runClassify = async (finalAnswers: Record<string, string>, sid: number | null) => {
    setMessages(prev => [...prev, { kind: 'thinking', role: 'assistant' }]);
    try {
      const res = await fetch('/api/qa/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: finalAnswers, session_id: sid }),
      });
      const data = await res.json();
      const matched: Service[] = data?.matched_services ?? data?.services ?? data?.results ?? [];
      const summary = data?.summary ?? (lang === 'en' ? "Here are matches based on your answers." : '입력하신 내용을 기준으로 추천드릴 민원이에요.');

      // 컨텍스트 저장 (재진입 시 사용)
      localStorage.setItem('analyze_result', JSON.stringify({ matched_services: matched, summary, answers: finalAnswers, session_id: sid }));
      localStorage.setItem('final_context', JSON.stringify({ answers: finalAnswers, lang, submitted_at: new Date().toISOString() }));

      setMessages(prev => [
        ...prev.filter(m => m.kind !== 'thinking'),
        { kind: 'cards', role: 'assistant', intro: summary, services: matched },
      ]);
      setStage('classify');
    } catch (e) {
      console.error('classify 실패:', e);
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), { kind: 'text', role: 'assistant', content: t.failServer }]);
    }
  };

  // --- 카드(민원) 선택 → service_detail + checklist ---
  const pickService = async (svc: Service) => {
    setMessages(prev => [
      ...prev,
      { kind: 'text', role: 'user', content: svc.service_name },
      { kind: 'thinking', role: 'assistant' },
    ]);

    const userType = (() => {
      const a = answers['1'];
      if (a?.includes('외국인')) return 'foreigner';
      if (a?.includes('노인') || a?.includes('고령')) return 'senior';
      if (a?.includes('저소득')) return 'low_income';
      return 'general';
    })();

    try {
      const [detailRes, checkRes] = await Promise.all([
        fetch('/api/service-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_name: svc.service_name, lang, user_type: userType }),
        }),
        fetch('/api/llm-checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_name: svc.service_name, lang, user_type: userType }),
        }),
      ]);
      const detail = await detailRes.json();
      const check = await checkRes.json();

      const newMsgs: Msg[] = [];
      if (detail?.detail) newMsgs.push({ kind: 'detail', role: 'assistant', serviceName: svc.service_name, content: detail.detail });
      if (check?.checklist) newMsgs.push({ kind: 'checklist', role: 'assistant', serviceName: svc.service_name, content: check.checklist });

      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), ...newMsgs]);
      setStage('freechat');
    } catch (e) {
      console.error('service_detail/checklist 실패:', e);
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), { kind: 'text', role: 'assistant', content: t.failServer }]);
    }
  };

  // --- 자유 채팅 (input bar 사용) ---
  const ensureChatSession = async (): Promise<number | null> => {
    if (!getAccessToken()) return null;
    if (chatSessionId) return chatSessionId;
    try {
      const res = await apiFetch('/api/chat-sessions', { method: 'POST', body: JSON.stringify({}) });
      const data = await res.json();
      if (data?.success && data.session?.id) { setChatSessionId(data.session.id); return data.session.id; }
    } catch (e) { console.error('세션 생성 실패:', e); }
    return null;
  };
  const saveMessage = async (sid: number, role: 'user' | 'assistant', content: string) => {
    try { await apiFetch(`/api/chat-sessions/${sid}/messages`, { method: 'POST', body: JSON.stringify({ role, content }) }); }
    catch (e) { console.error('메시지 저장 실패:', e); }
  };

  const sendFreeChat = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages(prev => [...prev, { kind: 'text', role: 'user', content: text }, { kind: 'text', role: 'assistant', content: '' }]);
    setSending(true);

    const sid = await ensureChatSession();
    if (sid) await saveMessage(sid, 'user', text);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          lang,
          history: messages.filter(m => m.kind === 'text').map((m: any) => ({ role: m.role, content: m.content })),
          session_id: externalSessionId,
        }),
      });

      if (!res.ok || !res.body) {
        await fallback(text, sid);
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
                const last = copy[copy.length - 1];
                if (last.kind === 'text' && last.role === 'assistant') copy[copy.length - 1] = { kind: 'text', role: 'assistant', content: acc };
                return copy;
              });
            }
          } catch {
            acc += payload;
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last.kind === 'text' && last.role === 'assistant') copy[copy.length - 1] = { kind: 'text', role: 'assistant', content: acc };
              return copy;
            });
          }
        }
      }
      if (!acc) await fallback(text, sid);
      else if (sid) await saveMessage(sid, 'assistant', acc);
    } catch (e) {
      console.error('chat stream error:', e);
      await fallback(text, sid);
    } finally {
      setSending(false);
    }
  };

  const fallback = async (question: string, sid: number | null) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, lang, session_id: externalSessionId }),
      });
      const data = await res.json();
      const ans = data.answer ?? data.error ?? t.failResponse;
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last.kind === 'text' && last.role === 'assistant') copy[copy.length - 1] = { kind: 'text', role: 'assistant', content: ans };
        return copy;
      });
      if (sid && ans) await saveMessage(sid, 'assistant', String(ans));
    } catch {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last.kind === 'text' && last.role === 'assistant') copy[copy.length - 1] = { kind: 'text', role: 'assistant', content: t.failServer };
        return copy;
      });
    }
  };

  // --- "새 대화" 처음부터 ---
  const handleNewChat = async () => {
    setMessages([]);
    setQaSessionId(null);
    setAnswers({});
    setChatSessionId(null);
    setStage('qa');
    setInput('');
    router.replace('/chat');
    initRef.current = false;
    await loadFirstQuestion();
    initRef.current = true;
  };

  // --- 음성 ---
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
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-slate-600';
  const inputBg = isHighContrast ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900';
  const userBubble = isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white';
  const botBubble = isHighContrast ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-800';
  const sendBtn = isHighContrast ? 'bg-yellow-400 hover:bg-yellow-300 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white';
  const newChatBtn = isHighContrast ? 'text-yellow-400 hover:bg-zinc-800' : 'text-blue-600 hover:bg-blue-50';
  const micBtn = isRecording
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : (isHighContrast ? 'bg-zinc-800 hover:bg-zinc-700 text-yellow-400' : 'bg-white border border-slate-200 hover:bg-slate-100 text-blue-600');
  const optionCard = isHighContrast
    ? 'bg-zinc-900 border-zinc-700 hover:border-yellow-400 hover:bg-zinc-800'
    : 'bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50';
  const serviceCard = isHighContrast
    ? 'bg-zinc-900 border-yellow-400 hover:bg-zinc-800'
    : 'bg-white border-blue-200 hover:bg-blue-50';

  const sizeBubble = isLargeFont ? 'text-lg' : 'text-base';
  const sizeTitle = isLargeFont ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl';

  return (
    <div className={`fixed inset-x-0 top-0 bottom-16 flex flex-col ${pageBg}`}>
      <div className={`mx-auto w-full max-w-md sm:max-w-2xl flex flex-col h-full`}>
        <header className={`px-5 sm:px-8 py-3 border-b ${headerBorder} flex items-center justify-between gap-2`}>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className={`flex items-center gap-1.5 -ml-2 px-3 py-2 rounded-lg transition-colors ${newChatBtn}`}
              aria-label="새 대화"
            >
              <PenSquare className="w-5 h-5" />
              <span className="font-medium">{lang === 'en' ? 'New chat' : '새 대화'}</span>
            </button>
            <button
              onClick={() => router.push('/list')}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-lg transition-colors ${newChatBtn}`}
              aria-label="대화 기록"
              title={lang === 'en' ? 'History' : '기록'}
            >
              <History className="w-5 h-5" />
            </button>
          </div>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && (
            <div className={`mt-12 flex flex-col items-center text-center ${subtleColor}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isHighContrast ? 'bg-zinc-800' : 'bg-blue-50'}`}>
                <Sparkles className={`w-7 h-7 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
              </div>
              <p className={`mt-4 ${sizeBubble}`}>{lang === 'en' ? 'Preparing...' : '준비 중...'}</p>
            </div>
          )}

          {messages.map((m, i) => {
            if (m.kind === 'text') {
              const isUser = m.role === 'user';
              return (
                <div
                  key={i}
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${sizeBubble} ${
                    isUser ? `${userBubble} self-end rounded-tr-md` : `${botBubble} self-start rounded-tl-md border`
                  }`}
                >
                  {m.content}
                </div>
              );
            }
            if (m.kind === 'thinking') {
              return (
                <div key={i} className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-md border self-start ${botBubble}`}>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                  </span>
                </div>
              );
            }
            if (m.kind === 'options') {
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-md whitespace-pre-wrap leading-relaxed shadow-sm border ${botBubble} ${sizeBubble}`}>
                    {m.question.question_text}
                  </div>
                  <div className="flex flex-col gap-2">
                    {m.question.answer_options?.map((opt) => (
                      <button
                        key={opt.value}
                        disabled={sending}
                        onClick={() => pickOption(m.question, opt)}
                        className={`w-full px-4 py-3 rounded-xl border-2 text-left font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${optionCard} ${titleColor} ${sizeBubble}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            if (m.kind === 'cards') {
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-md whitespace-pre-wrap leading-relaxed shadow-sm border ${botBubble} ${sizeBubble}`}>
                    {m.intro}
                  </div>
                  {m.services.length === 0 ? (
                    <p className={`${subtleColor} text-sm px-1`}>{lang === 'en' ? 'No matches.' : '맞는 민원을 찾지 못했어요.'}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {m.services.map((svc, idx) => (
                        <button
                          key={idx}
                          disabled={sending}
                          onClick={() => pickService(svc)}
                          className={`group rounded-2xl border-2 shadow-sm transition-all p-4 text-left flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${serviceCard}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${titleColor} ${sizeBubble}`}>{svc.service_name}</p>
                            {svc.agency && <p className={`mt-0.5 text-xs ${subtleColor}`}>{svc.agency}</p>}
                            {svc.eligibility && (
                              <p className={`mt-1.5 text-sm leading-relaxed ${descColor} line-clamp-2`}>{svc.eligibility}</p>
                            )}
                          </div>
                          <ChevronRight className={`shrink-0 w-5 h-5 mt-1 ${subtleColor}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (m.kind === 'detail') {
              return (
                <div key={i} className="flex flex-col gap-1 self-start max-w-full w-full">
                  <div className={`flex items-center gap-1.5 px-1 text-xs font-semibold ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>
                    <Sparkles className="w-3.5 h-3.5" /> {lang === 'en' ? `About ${m.serviceName}` : `${m.serviceName} 안내`}
                  </div>
                  <div className={`max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-md whitespace-pre-wrap leading-relaxed shadow-sm border ${botBubble} ${sizeBubble}`}>
                    {m.content}
                  </div>
                </div>
              );
            }
            if (m.kind === 'checklist') {
              return (
                <div key={i} className="flex flex-col gap-1 self-start max-w-full w-full">
                  <div className={`flex items-center gap-1.5 px-1 text-xs font-semibold ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>
                    <ClipboardList className="w-3.5 h-3.5" /> {lang === 'en' ? `Checklist for ${m.serviceName}` : `${m.serviceName} 체크리스트`}
                  </div>
                  <div className={`max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-md whitespace-pre-wrap leading-relaxed shadow-sm border ${botBubble} ${sizeBubble}`}>
                    {m.content}
                  </div>
                </div>
              );
            }
            return null;
          })}
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
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFreeChat(); } }}
              placeholder={stage === 'qa' ? (lang === 'en' ? 'Pick an option above, or type a free question...' : '위 옵션을 누르거나 직접 입력하셔도 됩니다') : t.placeholder}
              rows={1}
              className={`flex-1 resize-none px-4 py-2.5 rounded-2xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all ${inputBg} ${sizeBubble}`}
              disabled={sending}
            />
            <button
              onClick={sendFreeChat}
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
