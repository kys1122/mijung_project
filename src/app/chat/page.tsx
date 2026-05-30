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

type Service = { service_name: string; agency?: string; eligibility?: string };

// 단계별 질문 정의 — 챗봇 백엔드의 들쭉날쭉한 트리 대신 고정된 4단계
type StepKey = 'type' | 'age' | 'service' | 'detail';
const STEPS: { key: StepKey; question: { ko: string; en: string }; options?: { ko: string[]; en: string[] }; freeText?: boolean }[] = [
  {
    key: 'type',
    question: { ko: '어떤 분이세요?', en: 'Who are you?' },
    options: {
      ko: ['외국인', '노인 (65세 이상)', '저소득층', '해당없음'],
      en: ['Foreigner', 'Senior (65+)', 'Low Income', 'N/A'],
    },
  },
  {
    key: 'age',
    question: { ko: '나이대가 어떻게 되세요?', en: 'What is your age group?' },
    options: {
      ko: ['10대', '20대', '30대', '40대', '50대', '60대 이상'],
      en: ['10s', '20s', '30s', '40s', '50s', '60s or older'],
    },
  },
  {
    key: 'service',
    question: { ko: '어떤 민원 유형이 필요하세요?', en: 'What kind of service do you need?' },
    options: {
      // 챗봇 백엔드가 인식하는 한글 카테고리 (chatbot/app.py:486-559)
      ko: ['민원서류', '복지', '주거', '의료', '돌봄', '생활지원', '출입국', '교육·문화', '잘 모르겠어요'],
      en: ['Civil documents', 'Welfare', 'Housing', 'Medical', 'Care', 'Living support', 'Immigration', 'Education/Culture', 'Not sure'],
    },
  },
  {
    key: 'detail',
    question: { ko: '구체적으로 어떤 상황이세요?', en: 'Tell us about your situation' },
    freeText: true,
  },
];

const mapUserType = (val: string): string => {
  if (val.includes('외국인') || val.toLowerCase().includes('foreigner')) return '외국인';
  if (val.includes('노인') || val.toLowerCase().includes('senior')) return '노인/고령자';
  if (val.includes('저소득') || val.toLowerCase().includes('low')) return '저소득층';
  return '해당없음';
};
const mapAgeGroup = (val: string): string => {
  if (!val) return '';
  if (/^\d+대/.test(val) || val.includes('이상')) return val;
  const m = val.match(/(\d+)/);
  if (!m) return '';
  return parseInt(m[1], 10) >= 60 ? '60대 이상' : `${m[1]}대`;
};
// 챗봇 카테고리(한글) 그대로 통과 + 영어/구버전 옵션 한글 매핑
const mapCategory = (val: string): string => {
  if (!val) return '잘 모르겠어요';
  const map: Record<string, string> = {
    // 영어 라벨 → 한글 카테고리
    'Civil documents': '민원서류',
    'Welfare': '복지',
    'Housing': '주거',
    'Medical': '의료',
    'Care': '돌봄',
    'Living support': '생활지원',
    'Immigration': '출입국',
    'Education/Culture': '교육·문화',
    'Not sure': '잘 모르겠어요',
    // 구버전 한국어 옵션 호환
    '민원/서류': '민원서류',
    '민원': '민원서류',
    '일자리': '잘 모르겠어요',
    '기타/모르겠음': '잘 모르겠어요',
    'Jobs': '잘 모르겠어요',
    'Civil/Documents': '민원서류',
    'Other/Not sure': '잘 모르겠어요',
  };
  if (val in map) return map[val];
  // 챗봇이 알고 있는 한글 카테고리는 그대로
  const known = ['민원서류', '복지', '주거', '의료', '돌봄', '생활지원', '출입국', '교육·문화', '잘 모르겠어요'];
  return known.includes(val) ? val : '잘 모르겠어요';
};

type Msg =
  | { kind: 'text'; role: 'user' | 'assistant'; content: string }
  | { kind: 'options'; role: 'assistant'; stepIdx: number }
  | { kind: 'cards'; role: 'assistant'; intro: string; services: Service[] }
  | { kind: 'detail'; role: 'assistant'; serviceName: string; content: string }
  | { kind: 'checklist'; role: 'assistant'; serviceName: string; content: string }
  | { kind: 'thinking'; role: 'assistant' };

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
  const [intakeDone, setIntakeDone] = useState(false);
  const [answers, setAnswers] = useState<Record<StepKey, string>>({ type: '', age: '', service: '', detail: '' });
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

  const externalSessionId = (() => {
    if (typeof window === 'undefined') return undefined;
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) { sid = `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`; localStorage.setItem('chat_session_id', sid); }
    return sid;
  })();

  // --- 진입 시 ---
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      if (sessionParam) {
        const sid = Number(sessionParam);
        if (Number.isInteger(sid) && sid > 0 && getAccessToken()) {
          try {
            const res = await apiFetch(`/api/chat-sessions/${sid}`);
            if (res.ok) {
              const data = await res.json();
              setChatSessionId(data.session.id);
              const restored: Msg[] = (data.messages ?? []).map((m: any) => ({
                kind: 'text' as const, role: m.role, content: m.content,
              }));
              setMessages(restored);
              setIntakeDone(true);
              return;
            }
          } catch (e) { console.error('세션 로드 실패:', e); }
        }
      }
      startIntake();
    })();
  }, [sessionParam]);

  const startIntake = () => {
    setMessages([
      { kind: 'text', role: 'assistant', content: lang === 'en' ? "Hello! I'll find services that fit you. A few quick questions first." : '안녕하세요! 맞춤 민원을 찾아드릴게요. 몇 가지만 여쭤볼게요.' },
      { kind: 'options', role: 'assistant', stepIdx: 0 },
    ]);
  };

  const stepFromIdx = (idx: number) => STEPS[idx];
  const labelOf = (step: typeof STEPS[number], value: string) => {
    if (!step.options) return value;
    const ko = step.options.ko;
    const en = step.options.en;
    const koIdx = ko.indexOf(value);
    if (koIdx >= 0) return lang === 'en' ? en[koIdx] : ko[koIdx];
    const enIdx = en.indexOf(value);
    if (enIdx >= 0) return lang === 'en' ? en[enIdx] : ko[enIdx];
    return value;
  };

  const pickIntakeOption = (stepIdx: number, value: string) => {
    if (sending) return;
    const step = STEPS[stepIdx];
    const displayLabel = labelOf(step, value);
    setAnswers(prev => ({ ...prev, [step.key]: value }));
    setMessages(prev => [...prev, { kind: 'text', role: 'user', content: displayLabel }]);
    const nextIdx = stepIdx + 1;
    if (nextIdx < STEPS.length) {
      setMessages(prev => [...prev, { kind: 'options', role: 'assistant', stepIdx: nextIdx }]);
    } else {
      runAnalyze({ ...answers, [step.key]: value });
    }
  };

  const submitIntakeText = () => {
    if (sending || !input.trim()) return;
    const text = input.trim();
    setInput('');
    setAnswers(prev => ({ ...prev, detail: text }));
    setMessages(prev => [...prev, { kind: 'text', role: 'user', content: text }]);
    runAnalyze({ ...answers, detail: text });
  };

  const skipIntakeText = () => {
    if (sending) return;
    const skipLabel = lang === 'en' ? '(skipped)' : '(건너뜀)';
    setMessages(prev => [...prev, { kind: 'text', role: 'user', content: skipLabel }]);
    runAnalyze({ ...answers, detail: '' });
  };

  const runAnalyze = async (finalAnswers: Record<StepKey, string>) => {
    setSending(true);
    setMessages(prev => [...prev, { kind: 'thinking', role: 'assistant' }]);
    try {
      const payload = {
        user_type: mapUserType(finalAnswers.type),
        age_group: mapAgeGroup(finalAnswers.age),
        category: mapCategory(finalAnswers.service),
        detail: finalAnswers.detail,
        lang,
        visa_type: '',
      };
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const matched: Service[] = (data?.matched_services ?? []).map((s: any) => ({
        service_name: s.service_name,
        agency: s.agency ?? s.official_name,
        eligibility: s.eligibility,
      }));
      const intro = matched.length > 0
        ? (lang === 'en'
            ? `Here are ${matched.length} candidate service${matched.length === 1 ? '' : 's'} that may fit. Tap one to see details.`
            : `본인에게 맞을 만한 민원 ${matched.length}개를 찾았어요. 하나를 골라주시면 자세히 안내해드릴게요.`)
        : (lang === 'en' ? 'No matching services. Try changing your answers or ask freely below.' : '맞는 민원을 찾지 못했어요. 답변을 바꿔보시거나 아래에서 자유롭게 질문해주세요.');

      localStorage.setItem('analyze_result', JSON.stringify({ matched_services: matched, summary: data?.summary, answers: finalAnswers }));
      localStorage.setItem('final_context', JSON.stringify({ type: finalAnswers.type, age: finalAnswers.age, service: finalAnswers.service, detail: finalAnswers.detail, lang, submitted_at: new Date().toISOString() }));

      const newMsgs: Msg[] = [
        { kind: 'cards', role: 'assistant', intro, services: matched },
      ];
      if (data?.summary) {
        newMsgs.push({ kind: 'text', role: 'assistant', content: data.summary });
      }
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), ...newMsgs]);
      setIntakeDone(true);
    } catch (e) {
      console.error('analyze 실패:', e);
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), { kind: 'text', role: 'assistant', content: t.failServer }]);
    } finally {
      setSending(false);
    }
  };

  // --- 카드 선택 → 설명 + 체크리스트 ---
  const pickService = async (svc: Service) => {
    if (sending) return;
    setSending(true);
    setMessages(prev => [
      ...prev,
      { kind: 'text', role: 'user', content: svc.service_name },
      { kind: 'thinking', role: 'assistant' },
    ]);

    const userType = (() => {
      const a = answers.type;
      if (a?.includes('외국인')) return 'foreigner';
      if (a?.includes('노인') || a?.includes('고령')) return 'senior';
      if (a?.includes('저소득')) return 'low_income';
      return 'general';
    })();

    try {
      const [detailRes, checkRes] = await Promise.all([
        fetch('/api/service-detail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_name: svc.service_name, lang, user_type: userType }) }),
        fetch('/api/llm-checklist',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_name: svc.service_name, lang, user_type: userType }) }),
      ]);
      const detail = await detailRes.json();
      const check = await checkRes.json();
      const newMsgs: Msg[] = [];
      if (detail?.detail) newMsgs.push({ kind: 'detail', role: 'assistant', serviceName: svc.service_name, content: detail.detail });
      if (check?.checklist) newMsgs.push({ kind: 'checklist', role: 'assistant', serviceName: svc.service_name, content: check.checklist });
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), ...newMsgs]);
    } catch (e) {
      console.error('service_detail/checklist 실패:', e);
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), { kind: 'text', role: 'assistant', content: t.failServer }]);
    } finally {
      setSending(false);
    }
  };

  // --- 자유 채팅 ---
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
    try { await apiFetch(`/api/chat-sessions/${sid}/messages`, { method: 'POST', body: JSON.stringify({ role, content }) }); } catch (e) { console.error('메시지 저장 실패:', e); }
  };

  const sendFreeChat = async () => {
    if (!intakeDone) {
      // intake 중에는 free text input이 detail 단계에서만 사용되므로 분기
      const currentStepIdx = (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.kind === 'options') return m.stepIdx;
        }
        return -1;
      })();
      if (currentStepIdx === STEPS.length - 1) {
        submitIntakeText();
      }
      return;
    }
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
          question: text, lang,
          history: messages.filter(m => m.kind === 'text').map((m: any) => ({ role: m.role, content: m.content })),
          session_id: externalSessionId,
        }),
      });

      if (!res.ok || !res.body) { await fallback(text, sid); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', acc = '';
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
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, lang, session_id: externalSessionId }) });
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

  const handleNewChat = () => {
    setMessages([]);
    setAnswers({ type: '', age: '', service: '', detail: '' });
    setChatSessionId(null);
    setIntakeDone(false);
    setInput('');
    router.replace('/chat');
    initRef.current = false;
    startIntake();
    initRef.current = true;
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
        const fd = new FormData(); fd.append('file', blob, 'voice.wav'); fd.append('language', lang);
        try { const r = await fetch('/api/stt', { method: 'POST', body: fd }); const data = await r.json(); if (data.text) setInput(prev => (prev ? prev + ' ' : '') + data.text); }
        catch (e) { console.error('STT 실패:', e); }
      };
      rec.start();
      setIsRecording(true);
    } catch { alert(t.micPermission); }
  };
  const stopRec = () => { const r = mediaRecorderRef.current; if (r && r.state !== 'inactive') r.stop(); setIsRecording(false); };

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
  const sizeRich = isLargeFont ? 'text-lg' : 'text-base';

  // 간단 마크다운 렌더 — # 헤더, **굵게**, 리스트(-, *, 1.), 빈줄
  const renderInline = (text: string, keyPrefix: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={`${keyPrefix}-${j}`} className={isHighContrast ? 'text-yellow-400' : 'text-blue-700'}>{p.slice(2, -2)}</strong>
        : <span key={`${keyPrefix}-${j}`}>{p}</span>
    );
  };
  const renderRich = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trimEnd();
      if (!trimmed.trim()) return <div key={i} className="h-2" />;
      const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const content = hMatch[2];
        const cls = level <= 2
          ? `block mt-4 first:mt-0 font-bold ${isLargeFont ? 'text-xl' : 'text-lg'} ${isHighContrast ? 'text-yellow-400' : 'text-blue-700'}`
          : `block mt-3 first:mt-0 font-bold ${sizeRich}`;
        return <div key={i} className={cls}>{renderInline(content, `${i}h`)}</div>;
      }
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        return (
          <div key={i} className="flex gap-2 mt-1.5 first:mt-0">
            <span className={`shrink-0 font-bold ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>{numMatch[1]}.</span>
            <span className="flex-1">{renderInline(numMatch[2], `${i}n`)}</span>
          </div>
        );
      }
      if (/^[-*•]\s/.test(trimmed)) {
        return (
          <div key={i} className="flex gap-2 mt-1.5 first:mt-0">
            <span className={`shrink-0 ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>•</span>
            <span className="flex-1">{renderInline(trimmed.replace(/^[-*•]\s/, ''), `${i}l`)}</span>
          </div>
        );
      }
      return <div key={i} className="mt-1.5 first:mt-0">{renderInline(trimmed, `${i}p`)}</div>;
    });
  };

  // intake 단계 마지막에서만 input이 활성화 (detail step)
  const currentIntakeStep = (() => {
    if (intakeDone) return -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.kind === 'options') return m.stepIdx;
    }
    return -1;
  })();
  const inputEnabled = intakeDone || currentIntakeStep === STEPS.length - 1;
  const inputPlaceholder = intakeDone
    ? t.placeholder
    : (currentIntakeStep === STEPS.length - 1
      ? (lang === 'en' ? 'Type or skip below…' : '직접 입력하거나 아래 건너뛰기')
      : (lang === 'en' ? 'Pick an option above' : '위 옵션을 선택해주세요'));

  return (
    <div className={`fixed inset-x-0 top-0 bottom-16 flex flex-col ${pageBg}`}>
      <div className={`mx-auto w-full max-w-md sm:max-w-2xl flex flex-col h-full`}>
        <header className={`px-5 sm:px-8 py-3 border-b ${headerBorder} flex items-center justify-between gap-2`}>
          <div className="flex items-center gap-1">
            <button onClick={handleNewChat} className={`flex items-center gap-1.5 -ml-2 px-3 py-2 rounded-lg transition-colors ${newChatBtn}`} aria-label="새 대화">
              <PenSquare className="w-5 h-5" />
              <span className="font-medium">{lang === 'en' ? 'New chat' : '새 대화'}</span>
            </button>
            <button onClick={() => router.push('/list')} className={`flex items-center gap-1 px-2.5 py-2 rounded-lg transition-colors ${newChatBtn}`} aria-label="대화 기록" title={lang === 'en' ? 'History' : '기록'}>
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
                <div key={i} className={`max-w-[85%] px-4 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${sizeBubble} ${
                  isUser ? `${userBubble} self-end rounded-tr-md` : `${botBubble} self-start rounded-tl-md border`
                }`}>
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
              const step = stepFromIdx(m.stepIdx);
              const opts = step.options ? (lang === 'en' ? step.options.en : step.options.ko) : [];
              const koOpts = step.options?.ko ?? [];
              const isLastIntake = m.stepIdx === STEPS.length - 1 && i === messages.length - 1;
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-md whitespace-pre-wrap leading-relaxed shadow-sm border ${botBubble} ${sizeBubble}`}>
                    <span className={`mr-2 text-xs font-bold ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>
                      {m.stepIdx + 1}/{STEPS.length}
                    </span>
                    {step.question[lang === 'en' ? 'en' : 'ko']}
                  </div>
                  {step.options ? (
                    <div className="flex flex-col gap-2">
                      {opts.map((label, optIdx) => {
                        const koValue = koOpts[optIdx] ?? label;
                        return (
                          <button
                            key={koValue}
                            disabled={sending || m.stepIdx !== currentIntakeStep || intakeDone}
                            onClick={() => pickIntakeOption(m.stepIdx, koValue)}
                            className={`w-full px-4 py-3 rounded-xl border-2 text-left font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${optionCard} ${titleColor} ${sizeBubble}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : isLastIntake && (
                    <button
                      onClick={skipIntakeText}
                      disabled={sending}
                      className={`self-start px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${isHighContrast ? 'text-zinc-300 hover:text-yellow-400' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                      {lang === 'en' ? 'Skip this' : '건너뛰기'}
                    </button>
                  )}
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
                            {svc.eligibility && <p className={`mt-1.5 text-sm leading-relaxed ${descColor} line-clamp-2`}>{svc.eligibility}</p>}
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
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full self-start text-xs font-bold ${isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-blue-100 text-blue-700'}`}>
                    <Sparkles className="w-3.5 h-3.5" /> {lang === 'en' ? `${m.serviceName} — Guide` : `${m.serviceName} · 민원 안내`}
                  </div>
                  <div className={`w-full px-5 py-5 rounded-2xl rounded-tl-md shadow-sm border leading-loose ${botBubble} ${sizeRich}`}>
                    {renderRich(m.content)}
                  </div>
                </div>
              );
            }
            if (m.kind === 'checklist') {
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full self-start text-xs font-bold ${isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    <ClipboardList className="w-3.5 h-3.5" /> {lang === 'en' ? `${m.serviceName} — Checklist` : `${m.serviceName} · 체크리스트`}
                  </div>
                  <div className={`w-full px-5 py-5 rounded-2xl rounded-tl-md shadow-sm border leading-loose ${botBubble} ${sizeRich}`}>
                    {renderRich(m.content)}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        <div className={`px-5 sm:px-8 py-3 border-t ${headerBorder}`}>
          <div className="flex items-end gap-2">
            <button onClick={isRecording ? stopRec : startRec} disabled={!inputEnabled || sending}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors shadow-sm disabled:opacity-40 ${micBtn}`} aria-label="voice">
              <Mic className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFreeChat(); } }}
              placeholder={inputPlaceholder}
              rows={1}
              disabled={!inputEnabled || sending}
              className={`flex-1 resize-none px-4 py-2.5 rounded-2xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 ${inputBg} ${sizeBubble}`}
            />
            <button onClick={sendFreeChat} disabled={!inputEnabled || sending || !input.trim()}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${sendBtn}`} aria-label="send">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
