'use client';
/**
 * 챗봇 페이지 — ai_civil_service_navigator/chatbot/ui.py 그대로 옮김.
 * 흐름:
 *   1. 유형 선택 (외국인/노인/저소득층/해당없음)   ← /options.user_types
 *   2. 연령대 선택                                ← /options.age_groups
 *   3. 서비스 카테고리 선택                        ← /options.categories
 *   4. 세부사항 입력 (텍스트/음성 + 예시 버튼)
 *   5. /analyze → 관련 민원 카드 → 선택
 *   6. /service_detail → 민원 안내 + "체크리스트 보기"
 *   7. /checklist → 체크리스트 + service_info 링크
 *   8. 자유 채팅 (/chat)
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Mic, Sparkles, PenSquare, History, ChevronRight, ClipboardList, ExternalLink, ArrowLeft, Check } from 'lucide-react';
import TopSettings from '../components/TopSettings';
import BottomNav from '../components/BottomNav';
import { useTranslations } from '../lib/i18n';
import { STRINGS as CHAT_STRINGS, type ChatStrings } from '../lib/strings/chat';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
import { apiFetch, getAccessToken } from '@/lib/api-client';

type Options = { user_types: string[]; age_groups: string[]; categories: string[] };

type Service = {
  service_name: string;
  official_name?: string;
  targets?: string;
  eligibility?: string;
  official_link?: string;
  online_apply_url?: string;
  url?: string;
};

type Stage = 'step1' | 'step2' | 'step3' | 'step4' | 'cards' | 'detail' | 'checklist' | 'freechat';

type Msg =
  | { kind: 'text'; role: 'user' | 'assistant'; content: string }
  | { kind: 'options'; role: 'assistant'; stage: 'step1' | 'step2' | 'step3'; items: string[] }
  | { kind: 'detailInput'; role: 'assistant'; examples: string[] }
  | { kind: 'cards'; role: 'assistant'; services: Service[] }
  | { kind: 'detail'; role: 'assistant'; serviceName: string; content: string }
  | { kind: 'checklist'; role: 'assistant'; serviceName: string; content: string; info?: { official_link?: string; online_apply_url?: string; fee?: string; targets?: string } }
  | { kind: 'thinking'; role: 'assistant' };

const TYPE_ICON: Record<string, string> = {
  '노인/고령자': '👴', '저소득층': '🏠', '외국인': '🌍', '해당없음': '👤',
};
const CAT_ICON: Record<string, string> = {
  '민원서류': '📄', '복지': '🤝', '주거': '🏠', '의료': '🏥',
  '생활지원': '💡', '출입국': '✈️', '교육·문화': '📚', '잘 모르겠어요': '❓',
};
const EXAMPLES = [
  '할머니가 기초연금 받을 수 있나요?',
  '생활이 어려운데 도움받을 수 있나요?',
  '비자 만료되는데 어떻게 해야 하나요?',
];

// 체크리스트 — LLM 텍스트의 리스트 항목(1./-/*)을 진짜 체크박스 UI로 렌더
// 체크 상태는 localStorage("chk:<serviceName>")에 저장돼 같은 민원 다시 보면 복원
function ChecklistRenderer({
  content,
  serviceName,
  isHighContrast,
  isLargeFont,
}: {
  content: string;
  serviceName: string;
  isHighContrast: boolean;
  isLargeFont: boolean;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`chk:${serviceName}`);
      if (stored) setChecked(JSON.parse(stored));
    } catch {}
  }, [serviceName]);

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(`chk:${serviceName}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const checkboxOn = isHighContrast ? 'bg-yellow-400 border-yellow-400' : 'bg-emerald-500 border-emerald-500';
  const checkboxOff = isHighContrast ? 'bg-transparent border-zinc-500' : 'bg-white border-slate-300';
  const doneColor = isHighContrast ? 'text-zinc-500 line-through' : 'text-slate-500 line-through';
  const accent = isHighContrast ? 'text-yellow-400' : 'text-blue-600';
  const sizeRich = isLargeFont ? 'text-lg' : 'text-base';

  const renderInline = (text: string, keyPrefix: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={`${keyPrefix}-${j}`} className={isHighContrast ? 'text-yellow-400' : 'text-blue-700'}>{p.slice(2, -2)}</strong>
        : <span key={`${keyPrefix}-${j}`}>{p}</span>
    );
  };

  const lines = content.split('\n');
  // 체크 가능 항목 통계
  const totalItems = lines.filter(l => {
    const t = l.trimEnd();
    return /^(\d+)\.\s+/.test(t) || /^[-*•]\s/.test(t);
  }).length;
  const doneItems = Object.values(checked).filter(Boolean).length;

  return (
    <>
      {totalItems > 0 && (
        <div className={`flex items-center justify-between text-sm mb-2 pb-2 border-b ${isHighContrast ? 'border-zinc-700' : 'border-slate-200'}`}>
          <span className={`font-semibold ${accent}`}>진행 {doneItems}/{totalItems}</span>
          <div className={`flex-1 ml-3 h-1.5 rounded-full overflow-hidden ${isHighContrast ? 'bg-zinc-800' : 'bg-slate-100'}`}>
            <div
              className={`h-full rounded-full transition-all ${isHighContrast ? 'bg-yellow-400' : 'bg-emerald-500'}`}
              style={{ width: `${totalItems ? (doneItems / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        // 들여쓰기 수준 — 줄 앞 공백 개수로 계산 (2칸 = 1단계)
        const indentSpaces = (line.match(/^(\s*)/)?.[1] ?? '').replace(/\t/g, '  ').length;
        const indentLevel = Math.min(Math.floor(indentSpaces / 2), 3);
        const indentClass = ['pl-0', 'pl-5', 'pl-10', 'pl-14'][indentLevel];

        const trimmed = line.trim();

        // 헤더 (#, ##, ###)
        const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (hMatch) {
          const level = hMatch[1].length;
          const cls = level <= 2
            ? `block mt-5 first:mt-0 pb-2 font-bold border-b ${isHighContrast ? 'border-yellow-400/40 text-yellow-400' : 'border-blue-200 text-blue-700'} ${isLargeFont ? 'text-2xl' : 'text-xl'}`
            : `block mt-4 first:mt-0 font-bold ${sizeRich} ${isHighContrast ? 'text-yellow-300' : 'text-slate-800'}`;
          return <div key={i} className={cls}>{renderInline(hMatch[2], `${i}h`)}</div>;
        }

        // 마크다운 task — `- [ ] 항목` / `1. [ ] 항목` / `[ ] 항목` 모두 처리
        // LLM이 답변에 마크다운 체크박스로 항목을 적기 때문에 [ ]는 화면에 안 보이게 제거하고 진짜 체크박스로 변환
        const taskMatch = trimmed.match(/^(?:(\d+)\.\s+)?(?:[-*•]\s+)?\[\s*[xX ]?\s*\]\s+(.*)$/);
        if (taskMatch) {
          const num = taskMatch[1];
          const key = `t${i}`;
          const isChecked = !!checked[key];
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(key)}
              className={`w-full flex gap-3 items-start mt-2.5 first:mt-0 text-left py-1 px-2 rounded-lg ${indentClass} ${isHighContrast ? 'hover:bg-zinc-800' : 'hover:bg-slate-50'}`}
            >
              <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? checkboxOn : checkboxOff}`}>
                {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </span>
              <span className={`flex-1 ${isChecked ? doneColor : titleColor}`}>
                {num && <span className={`mr-1.5 font-bold ${accent}`}>{num}.</span>}
                {renderInline(taskMatch[2], `${i}t`)}
              </span>
            </button>
          );
        }

        // 일반 번호 리스트 (체크박스 X) → 체크박스로 (LLM이 [ ]없이 1. 식으로 줄 때도)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const key = `n${i}`;
          const isChecked = !!checked[key];
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(key)}
              className={`w-full flex gap-3 items-start mt-2.5 first:mt-0 text-left py-1 px-2 rounded-lg ${indentClass} ${isHighContrast ? 'hover:bg-zinc-800' : 'hover:bg-slate-50'}`}
            >
              <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? checkboxOn : checkboxOff}`}>
                {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </span>
              <span className={`flex-1 ${isChecked ? doneColor : titleColor}`}>
                <span className={`mr-1.5 font-bold ${accent}`}>{numMatch[1]}.</span>
                {renderInline(numMatch[2], `${i}n`)}
              </span>
            </button>
          );
        }

        // 불릿 리스트 (체크박스 X) — 보통 헤더 아래 보충 설명
        if (/^[-*•]\s/.test(trimmed)) {
          return (
            <div key={i} className={`flex gap-2 mt-1.5 first:mt-0 ${indentClass} ${sizeRich}`}>
              <span className={`shrink-0 ${accent}`}>•</span>
              <span className={`flex-1 ${isHighContrast ? 'text-zinc-300' : 'text-slate-700'}`}>
                {renderInline(trimmed.replace(/^[-*•]\s+/, ''), `${i}b`)}
              </span>
            </div>
          );
        }

        // 일반 텍스트
        return (
          <div key={i} className={`mt-2 first:mt-0 ${indentClass} ${isHighContrast ? 'text-zinc-200' : 'text-slate-700'}`}>
            {renderInline(trimmed, `${i}p`)}
          </div>
        );
      })}
    </>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [opts, setOpts] = useState<Options | null>(null);
  const [stage, setStage] = useState<Stage>('step1');
  const [selections, setSelections] = useState({ user_type: '', age_group: '', category: '', detail: '' });
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [input, setInput] = useState('');
  const [detailInput, setDetailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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

  // 진입 시 옵션 받고 Step 1 시작
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
              setStage('freechat');
              return;
            }
          } catch (e) { console.error('세션 로드 실패:', e); }
        }
      }
      try {
        const res = await fetch('/api/options');
        const data: Options = await res.json();
        setOpts(data);
        setMessages([
          { kind: 'text', role: 'assistant', content: lang === 'en' ? 'Hello! Tell me a bit about yourself to find the right service.' : '안녕하세요! 맞춤 민원을 찾아드릴게요. 어떤 분이 이용하시나요?' },
          { kind: 'options', role: 'assistant', stage: 'step1', items: data.user_types },
        ]);
        setStage('step1');
      } catch (e) {
        console.error('options 로드 실패:', e);
      }
    })();
  }, [sessionParam, lang]);

  // 단계별 선택 핸들러
  const pickStep1 = (ut: string) => {
    setSelections(s => ({ ...s, user_type: ut }));
    setMessages(prev => [
      ...prev,
      { kind: 'text', role: 'user', content: ut },
      { kind: 'text', role: 'assistant', content: lang === 'en' ? 'How old are you?' : '연령대를 선택해 주세요.' },
      { kind: 'options', role: 'assistant', stage: 'step2', items: opts?.age_groups ?? [] },
    ]);
    setStage('step2');
    // 외국인 선택 시 영어로 자동 전환 (ui.py:406-407)
    if (ut === '외국인' && lang === 'ko') handleLang('en');
  };
  const pickStep2 = (ag: string) => {
    setSelections(s => ({ ...s, age_group: ag }));
    setMessages(prev => [
      ...prev,
      { kind: 'text', role: 'user', content: ag },
      { kind: 'text', role: 'assistant', content: lang === 'en' ? 'What kind of service do you need?' : '어떤 종류의 서비스가 필요하세요?' },
      { kind: 'options', role: 'assistant', stage: 'step3', items: opts?.categories ?? [] },
    ]);
    setStage('step3');
  };
  const pickStep3 = (cat: string) => {
    setSelections(s => ({ ...s, category: cat }));
    setMessages(prev => [
      ...prev,
      { kind: 'text', role: 'user', content: cat },
      { kind: 'text', role: 'assistant', content: lang === 'en' ? 'Tell me about your situation.' : '현재 상황을 알려주세요. 자유롭게 입력하거나 아래 예시를 눌러보세요.' },
      { kind: 'detailInput', role: 'assistant', examples: EXAMPLES },
    ]);
    setStage('step4');
  };
  const submitDetail = (text: string) => {
    if (!text.trim()) return;
    setSelections(s => ({ ...s, detail: text }));
    setDetailInput('');
    setMessages(prev => [...prev, { kind: 'text', role: 'user', content: text }]);
    runAnalyze({ ...selections, detail: text });
  };

  // Step 5: /analyze
  const runAnalyze = async (finalSel: typeof selections) => {
    setSending(true);
    setMessages(prev => [...prev, { kind: 'thinking', role: 'assistant' }]);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: finalSel.user_type,
          age_group: finalSel.age_group,
          category: finalSel.category,
          detail: finalSel.detail,
          lang,
        }),
      });
      const data = await res.json();
      const services: Service[] = data?.matched_services ?? [];
      localStorage.setItem('analyze_result', JSON.stringify(data));
      localStorage.setItem('final_context', JSON.stringify({ ...finalSel, lang, submitted_at: new Date().toISOString() }));

      setMessages(prev => [
        ...prev.filter(m => m.kind !== 'thinking'),
        {
          kind: 'text',
          role: 'assistant',
          content: services.length === 0
            ? (lang === 'en' ? "I couldn't find a matching service. Try different details below." : '입력하신 상황에 맞는 민원을 찾지 못했습니다. 아래에서 자유롭게 질문해 주세요.')
            : (lang === 'en' ? '📋 Here are the recommended services. Pick one to see details.' : '📋 맞춤 민원 추천 결과입니다. 자세히 알고 싶은 민원을 선택해 주세요.'),
        },
        { kind: 'cards', role: 'assistant', services },
      ]);
      setStage('cards');
    } catch (e) {
      console.error('analyze 실패:', e);
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), { kind: 'text', role: 'assistant', content: t.failServer }]);
    } finally {
      setSending(false);
    }
  };

  // /dashboard "내 진행 중인 민원"에 기록되도록 visit API 호출
  const recordVisit = async (serviceName: string, step: 'description' | 'checklist') => {
    if (!getAccessToken()) return;
    try {
      await apiFetch(`/api/my-services/${encodeURIComponent(serviceName)}/visit`, {
        method: 'POST',
        body: JSON.stringify({ step }),
      });
    } catch (e) { console.error('visit 기록 실패:', e); }
  };

  // Step 6: 카드 선택 → service_detail
  const pickService = async (svc: Service) => {
    setSelectedService(svc);
    setMessages(prev => [
      ...prev,
      { kind: 'text', role: 'user', content: svc.service_name },
      { kind: 'thinking', role: 'assistant' },
    ]);
    setSending(true);
    // /dashboard에 "이 사용자가 이 민원 진행 중"으로 기록
    recordVisit(svc.service_name, 'description');
    try {
      const res = await fetch('/api/service-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: svc.service_name,
          lang,
          user_type: selections.user_type,
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev.filter(m => m.kind !== 'thinking'),
        { kind: 'detail', role: 'assistant', serviceName: svc.service_name, content: data?.detail ?? '' },
      ]);
      setStage('detail');
    } catch (e) {
      console.error('service_detail 실패:', e);
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), { kind: 'text', role: 'assistant', content: t.failServer }]);
    } finally {
      setSending(false);
    }
  };

  // Step 7: 체크리스트 보기 → /checklist
  const loadChecklist = async () => {
    if (!selectedService) return;
    setMessages(prev => [
      ...prev,
      { kind: 'text', role: 'user', content: lang === 'en' ? '📝 Show checklist' : '📝 신청 체크리스트 보기' },
      { kind: 'thinking', role: 'assistant' },
    ]);
    setSending(true);
    recordVisit(selectedService.service_name, 'checklist');
    try {
      const res = await fetch('/api/llm-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: selectedService.service_name,
          lang,
          user_type: selections.user_type,
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev.filter(m => m.kind !== 'thinking'),
        {
          kind: 'checklist',
          role: 'assistant',
          serviceName: selectedService.service_name,
          content: data?.checklist ?? '',
          info: data?.service_info ?? {},
        },
      ]);
      setStage('checklist');
    } catch (e) {
      console.error('checklist 실패:', e);
      setMessages(prev => [...prev.filter(m => m.kind !== 'thinking'), { kind: 'text', role: 'assistant', content: t.failServer }]);
    } finally {
      setSending(false);
    }
  };

  // Step 8: 자유 채팅
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
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages(prev => [...prev, { kind: 'text', role: 'user', content: text }, { kind: 'text', role: 'assistant', content: '' }]);
    setSending(true);

    const sid = await ensureChatSession();
    if (sid) await saveMessage(sid, 'user', text);

    try {
      // ui.py _handle_chat_input: user_type / category / lang / history / session_id 전달
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          user_type: selections.user_type,
          category: selections.category,
          lang,
          history: messages.filter(m => m.kind === 'text').map((m: any) => ({ role: m.role, content: m.content })),
          session_id: externalSessionId,
        }),
      });
      const data = await res.json();
      const ans = data?.answer ?? data?.error ?? t.failResponse;
      const sources: Service[] = Array.isArray(data?.sources) ? data.sources : [];
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last.kind === 'text' && last.role === 'assistant') copy[copy.length - 1] = { kind: 'text', role: 'assistant', content: ans };
        if (sources.length > 0) {
          copy.push({ kind: 'cards', role: 'assistant', services: sources });
        }
        return copy;
      });
      if (sid && ans) await saveMessage(sid, 'assistant', String(ans));
    } catch (e) {
      console.error('chat error:', e);
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last.kind === 'text' && last.role === 'assistant') copy[copy.length - 1] = { kind: 'text', role: 'assistant', content: t.failServer };
        return copy;
      });
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = async () => {
    setMessages([]);
    setSelections({ user_type: '', age_group: '', category: '', detail: '' });
    setSelectedService(null);
    setStage('step1');
    setInput('');
    setDetailInput('');
    setChatSessionId(null);
    router.replace('/chat');
    initRef.current = false;
    // re-trigger init
    setTimeout(() => { initRef.current = true; }, 0);
    try {
      const res = await fetch('/api/options');
      const data: Options = await res.json();
      setOpts(data);
      setMessages([
        { kind: 'text', role: 'assistant', content: lang === 'en' ? 'Hello! Tell me a bit about yourself to find the right service.' : '안녕하세요! 맞춤 민원을 찾아드릴게요. 어떤 분이 이용하시나요?' },
        { kind: 'options', role: 'assistant', stage: 'step1', items: data.user_types },
      ]);
    } catch (e) { console.error('options 로드 실패:', e); }
  };

  const goPickAnotherService = () => {
    setSelectedService(null);
    setStage('cards');
    setMessages(prev => [
      ...prev,
      { kind: 'text', role: 'user', content: lang === 'en' ? '⬅️ Pick another service' : '⬅️ 다른 민원 선택' },
    ]);
  };

  // 음성
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
        try {
          const r = await fetch('/api/stt', { method: 'POST', body: fd });
          const data = await r.json();
          if (data?.text) {
            if (stage === 'step4') setDetailInput(prev => (prev ? prev + ' ' : '') + data.text);
            else setInput(prev => (prev ? prev + ' ' : '') + data.text);
          }
        } catch (e) { console.error('STT 실패:', e); }
      };
      rec.start();
      setIsRecording(true);
    } catch { alert(t.micPermission); }
  };
  const stopRec = () => { const r = mediaRecorderRef.current; if (r && r.state !== 'inactive') r.stop(); setIsRecording(false); };

  // 디자인 토큰
  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const headerBorder = isHighContrast ? 'border-zinc-700' : 'border-slate-200/70';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-600';
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
  const exampleBtn = isHighContrast
    ? 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200'
    : 'bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700';

  const sizeBubble = isLargeFont ? 'text-lg' : 'text-base';
  const sizeRich = isLargeFont ? 'text-lg' : 'text-base';

  // 간단 마크다운 렌더 (ui.py의 render_md 대응)
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
      if (!line.trim()) return <div key={i} className="h-3" />;

      const indentSpaces = (line.match(/^(\s*)/)?.[1] ?? '').replace(/\t/g, '  ').length;
      const indentLevel = Math.min(Math.floor(indentSpaces / 2), 3);
      const indentClass = ['pl-0', 'pl-5', 'pl-10', 'pl-14'][indentLevel];

      const trimmed = line.trim();

      // [ ] 마크 제거 — detail 텍스트도 LLM이 가끔 task list로 답함
      const cleaned = trimmed.replace(/^(\d+\.\s+|[-*•]\s+)?\[\s*[xX ]?\s*\]\s*/, '$1');

      // 헤더
      const hMatch = cleaned.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const cls = level <= 2
          ? `block mt-5 first:mt-0 pb-2 font-bold border-b ${isHighContrast ? 'border-yellow-400/40 text-yellow-400' : 'border-blue-200 text-blue-700'} ${isLargeFont ? 'text-2xl' : 'text-xl'}`
          : `block mt-4 first:mt-0 font-bold ${sizeRich} ${isHighContrast ? 'text-yellow-300' : 'text-slate-800'}`;
        return <div key={i} className={cls}>{renderInline(hMatch[2], `${i}h`)}</div>;
      }
      // 번호 리스트
      const numMatch = cleaned.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        return (
          <div key={i} className={`flex gap-2 mt-2 first:mt-0 ${indentClass}`}>
            <span className={`shrink-0 font-bold ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>{numMatch[1]}.</span>
            <span className={`flex-1 ${isHighContrast ? 'text-zinc-200' : 'text-slate-700'}`}>{renderInline(numMatch[2], `${i}n`)}</span>
          </div>
        );
      }
      // 불릿
      if (/^[-*•]\s/.test(cleaned)) {
        return (
          <div key={i} className={`flex gap-2 mt-1.5 first:mt-0 ${indentClass}`}>
            <span className={`shrink-0 ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>•</span>
            <span className={`flex-1 ${isHighContrast ? 'text-zinc-300' : 'text-slate-700'}`}>{renderInline(cleaned.replace(/^[-*•]\s+/, ''), `${i}l`)}</span>
          </div>
        );
      }
      // 일반 문단
      return (
        <div key={i} className={`mt-2 first:mt-0 ${indentClass} ${isHighContrast ? 'text-zinc-200' : 'text-slate-700'}`}>
          {renderInline(cleaned, `${i}p`)}
        </div>
      );
    });
  };

  // 진행 단계 인디케이터 (ui.py의 step_labels 대응)
  const STEP_LABELS = lang === 'en'
    ? ['Type', 'Age', 'Category', 'Situation', 'Results', 'Detail', 'Checklist']
    : ['유형', '연령대', '분류', '상황', '추천', '안내', '체크리스트'];
  const stepIdxOf = (s: Stage): number => {
    switch (s) {
      case 'step1': return 0;
      case 'step2': return 1;
      case 'step3': return 2;
      case 'step4': return 3;
      case 'cards': return 4;
      case 'detail': return 5;
      case 'checklist': return 6;
      default: return -1;
    }
  };
  const currentStepIdx = stepIdxOf(stage);

  const inputEnabled = stage === 'freechat' || stage === 'checklist' || stage === 'detail';
  const inputPlaceholder = inputEnabled
    ? t.placeholder
    : (lang === 'en' ? 'Pick an option above' : '위에서 선택해주세요');

  return (
    <div className={`fixed inset-x-0 top-0 bottom-16 flex flex-col ${pageBg}`}>
      <div className={`mx-auto w-full max-w-md sm:max-w-2xl flex flex-col h-full`}>
        <header className={`px-5 sm:px-8 py-3 border-b ${headerBorder} flex items-center justify-between gap-2`}>
          <div className="flex items-center gap-1">
            <button onClick={handleNewChat} className={`flex items-center gap-1.5 -ml-2 px-3 py-2 rounded-lg transition-colors ${newChatBtn}`} aria-label="새 대화">
              <PenSquare className="w-5 h-5" />
              <span className="font-medium">{lang === 'en' ? 'New chat' : '새 대화'}</span>
            </button>
            <button onClick={() => router.push('/list')} className={`flex items-center gap-1 px-2.5 py-2 rounded-lg transition-colors ${newChatBtn}`} aria-label="기록" title={lang === 'en' ? 'History' : '기록'}>
              <History className="w-5 h-5" />
            </button>
          </div>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        {/* 진행 인디케이터 */}
        {currentStepIdx >= 0 && (
          <div className={`px-5 sm:px-8 py-2 border-b ${headerBorder} overflow-x-auto`}>
            <div className="flex items-center gap-1.5 min-w-max text-xs">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={
                    i === currentStepIdx
                      ? `font-bold ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`
                      : i < currentStepIdx
                        ? subtleColor
                        : (isHighContrast ? 'text-zinc-600' : 'text-slate-300')
                  }>
                    {i < currentStepIdx ? '✓' : i === currentStepIdx ? '●' : '○'} {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && <span className={isHighContrast ? 'text-zinc-700' : 'text-slate-300'}>—</span>}
                </div>
              ))}
            </div>
          </div>
        )}

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
              const isActive = (m.stage === 'step1' && stage === 'step1')
                || (m.stage === 'step2' && stage === 'step2')
                || (m.stage === 'step3' && stage === 'step3');
              const handler = m.stage === 'step1' ? pickStep1 : m.stage === 'step2' ? pickStep2 : pickStep3;
              const iconMap = m.stage === 'step1' ? TYPE_ICON : m.stage === 'step3' ? CAT_ICON : {};
              const useGrid = m.stage === 'step2' || m.stage === 'step3';
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={useGrid ? 'grid grid-cols-2 sm:grid-cols-3 gap-2' : 'flex flex-col gap-2'}>
                    {m.items.map((opt) => (
                      <button
                        key={opt}
                        disabled={!isActive || sending}
                        onClick={() => handler(opt)}
                        className={`px-4 py-3 rounded-xl border-2 text-left font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${optionCard} ${titleColor} ${sizeBubble}`}
                      >
                        {iconMap[opt] ? <span className="mr-2">{iconMap[opt]}</span> : null}
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            if (m.kind === 'detailInput') {
              const isActive = stage === 'step4';
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={`rounded-2xl border shadow-sm p-4 ${botBubble}`}>
                    <p className={`text-sm ${subtleColor} mb-2`}>
                      💡 {lang === 'en' ? 'Example: "My grandmother has trouble moving, and we want care at home."' : '예시: "할머니가 거동이 불편하셔서 집에서 돌봄 서비스를 받고 싶어요"'}
                    </p>
                    <textarea
                      value={detailInput}
                      onChange={(e) => setDetailInput(e.target.value)}
                      placeholder={lang === 'en' ? 'Describe your situation...' : '현재 어려움이나 필요한 서비스를 설명해 주세요...'}
                      rows={3}
                      disabled={!isActive || sending}
                      className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none disabled:opacity-50 ${inputBg} ${sizeBubble}`}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.examples.map((ex, ei) => (
                        <button
                          key={ei}
                          disabled={!isActive || sending}
                          onClick={() => submitDetail(ex)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${exampleBtn}`}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={isRecording ? stopRec : startRec}
                        disabled={!isActive || sending}
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${micBtn}`}
                        aria-label="voice"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => submitDetail(detailInput)}
                        disabled={!isActive || sending || !detailInput.trim()}
                        className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${sendBtn}`}
                      >
                        {lang === 'en' ? '🔍 Analyze' : '🔍 분석하기'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            if (m.kind === 'cards') {
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  {m.services.length === 0 ? (
                    <p className={`${subtleColor} text-sm px-1`}>{lang === 'en' ? 'No matches.' : '결과가 없습니다.'}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {m.services.map((svc, idx) => {
                        const subTitle = svc.official_name && svc.official_name !== svc.service_name ? svc.official_name : undefined;
                        const link = svc.official_link || svc.url;
                        const targetChips = (svc.targets ?? '').split(/[,，·•]/).map(s => s.trim()).filter(Boolean).slice(0, 4);
                        return (
                          <button
                            key={idx}
                            disabled={sending}
                            onClick={() => pickService(svc)}
                            className={`group rounded-2xl border-2 shadow-sm transition-all p-4 text-left flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${serviceCard}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold ${titleColor} ${sizeBubble}`}>{svc.service_name}</p>
                              {subTitle && <p className={`mt-0.5 text-xs ${subtleColor} truncate`}>{subTitle}</p>}
                              {targetChips.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {targetChips.map((tg, ti) => (
                                    <span
                                      key={ti}
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${isHighContrast ? 'bg-zinc-800 text-yellow-400 border border-yellow-400/40' : 'bg-blue-50 text-blue-700'}`}
                                    >
                                      {tg}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {svc.eligibility && <p className={`mt-1.5 text-sm leading-relaxed ${descColor} line-clamp-2`}>{svc.eligibility}</p>}
                              {link && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = link.startsWith('http') ? link : `https://${link}`;
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                  }}
                                  className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer ${isHighContrast ? 'text-yellow-400 hover:text-yellow-300' : 'text-blue-600 hover:text-blue-700'}`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {lang === 'en' ? 'Official page' : '공식 페이지'}
                                </span>
                              )}
                            </div>
                            <ChevronRight className={`shrink-0 w-5 h-5 mt-1 ${subtleColor}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            if (m.kind === 'detail') {
              const showActions = stage === 'detail' && selectedService?.service_name === m.serviceName;
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full self-start text-xs font-bold ${isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-blue-100 text-blue-700'}`}>
                    <Sparkles className="w-3.5 h-3.5" /> {m.serviceName} · {lang === 'en' ? 'Guide' : '민원 안내'}
                  </div>
                  <div className={`w-full px-5 py-5 rounded-2xl rounded-tl-md shadow-sm border leading-loose ${botBubble} ${sizeRich}`}>
                    {renderRich(m.content)}
                  </div>
                  {showActions && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <button
                        onClick={loadChecklist}
                        disabled={sending}
                        className={`px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 ${sendBtn}`}
                      >
                        {lang === 'en' ? '📝 Show checklist' : '📝 신청 체크리스트 보기'}
                      </button>
                      <button
                        onClick={goPickAnotherService}
                        disabled={sending}
                        className={`px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 ${exampleBtn}`}
                      >
                        <ArrowLeft className="w-4 h-4 inline mr-1" />
                        {lang === 'en' ? 'Other service' : '다른 민원'}
                      </button>
                    </div>
                  )}
                </div>
              );
            }
            if (m.kind === 'checklist') {
              const info = m.info ?? {};
              return (
                <div key={i} className="flex flex-col gap-2 self-start max-w-full w-full">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full self-start text-xs font-bold ${isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    <ClipboardList className="w-3.5 h-3.5" /> {m.serviceName} · {lang === 'en' ? 'Checklist' : '체크리스트'}
                  </div>
                  <div className={`w-full px-5 py-5 rounded-2xl rounded-tl-md shadow-sm border leading-loose ${botBubble} ${sizeRich}`}>
                    <ChecklistRenderer
                      content={m.content}
                      serviceName={m.serviceName}
                      isHighContrast={isHighContrast}
                      isLargeFont={isLargeFont}
                    />
                  </div>
                  {(info.official_link || info.online_apply_url || info.fee) && (
                    <div className={`rounded-2xl border p-4 ${isHighContrast ? 'bg-zinc-900 border-zinc-700' : 'bg-blue-50 border-blue-100'}`}>
                      <p className={`text-sm font-bold mb-2 ${titleColor}`}>🔗 {lang === 'en' ? 'Useful links' : '유용한 링크'}</p>
                      <div className="flex flex-col gap-1.5 text-sm">
                        {info.official_link && (
                          <a href={info.official_link.startsWith('http') ? info.official_link : `https://${info.official_link}`} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>
                            🔗 {lang === 'en' ? 'Official' : '공식 사이트'} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {info.online_apply_url && (
                          <a href={info.online_apply_url.startsWith('http') ? info.online_apply_url : `https://${info.online_apply_url}`} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>
                            💻 {lang === 'en' ? 'Apply online' : '온라인 신청'} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {info.fee && <p className={subtleColor}>💰 {lang === 'en' ? 'Fee' : '수수료'}: {info.fee}</p>}
                      </div>
                    </div>
                  )}
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
