'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopSettings from '../components/TopSettings';
import ChatFab from '../components/ChatFab';
import { useTranslations } from '../lib/i18n';
import { STRINGS as QA_STRINGS, type QaStrings } from '../lib/strings/qa';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';

export default function QaPage() {
  const router = useRouter();
  
  // --- 상태 관리 ---
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [selections, setSelections] = useState({ type: '', age: '', service: '', detail: '' });
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'age' | 'service' | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // --- [추가] 페이지 로드 시 localStorage에서 설정 불러오기 ---
  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') ?? '';
    const savedContrast = localStorage.getItem('app_contrast') === 'true';
    const savedFont = localStorage.getItem('app_font') === 'true';

    if (isSupported(savedLang)) setLang(savedLang);
    if (savedContrast) setIsHighContrast(savedContrast);
    if (savedFont) setIsLargeFont(savedFont);
  }, []);

  // --- [추가] 설정 변경 시 localStorage에 저장하는 핸들러 ---
  const handleLang = (newLang: LangCode) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const handleContrast = (val: boolean) => {
    setIsHighContrast(val);
    localStorage.setItem('app_contrast', String(val));
  };

  const handleFont = (val: boolean) => {
    setIsLargeFont(val);
    localStorage.setItem('app_font', String(val));
  };

  // --- 음성 녹음 관련 Ref ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = useTranslations<QaStrings>('qa', QA_STRINGS as { ko: QaStrings; en: QaStrings }, lang);

  // --- 비즈니스 로직 (세션 복원, 음성 인식 등) ---
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/v1/questions/session/current-user');
        if (response.ok) {
          const data = await response.json();
          if (data.answer_json) setSelections(data.answer_json);
        }
      } catch (e) { console.log("진행 중인 세션 없음"); }
    };
    fetchSession();
  }, []);

  const handleStartVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await uploadVoice(audioBlob); 
      };
      recorder.start();
      setIsVoiceModalOpen(true);
    } catch (err) { alert("마이크 권한을 허용해 주세요."); }
  };

  const uploadVoice = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'voice.wav');
    formData.append('language', lang);
    try {
      const response = await fetch('/api/stt', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.text) setSelections(prev => ({ ...prev, detail: data.text }));
    } catch (e) { console.error("STT 전송 실패:", e); }
    finally { setIsVoiceModalOpen(false); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSelect = (category: string, value: string) => {
    setSelections(prev => ({ ...prev, [category]: value }));
    setIsSelectModalOpen(false);
  };

  // qa 선택값 → /analyze 요청 페이로드 매핑 (서버 실제 키 사용)
  // 서버 /options: user_types=["노인/고령자","저소득층","외국인","해당없음"],
  //                age_groups=["10대".."60대 이상"],
  //                categories=["민원서류","복지","주거","의료","돌봄","생활지원","출입국","교육·문화"]
  const mapUserType = (t: string): string => {
    if (t.includes('외국인') || t.toLowerCase().includes('foreigner')) return '외국인';
    if (t.includes('노인') || t.toLowerCase().includes('senior')) return '노인/고령자';
    if (t.includes('저소득') || t.toLowerCase().includes('low')) return '저소득층';
    return '해당없음';
  };
  const mapAgeGroup = (a: string): string => {
    // qa(ko)는 이미 '10대'/'60대 이상' 형식; qa(en)은 '10s'/'60s or older'
    if (!a) return '';
    if (/^\d+대/.test(a) || a.includes('이상')) return a;
    const m = a.match(/(\d+)/);
    if (!m) return '';
    return parseInt(m[1], 10) >= 60 ? '60대 이상' : `${m[1]}대`;
  };
  const mapCategory = (s: string): string => {
    if (!s) return '';
    const map: Record<string, string> = {
      // 한국어 qa 옵션 → 서버 카테고리
      '민원': '민원서류',
      '복지': '복지',
      '주거': '주거',
      '의료': '의료',
      '일자리': '', // 서버에 매칭되는 카테고리 없음 → 빈 값 (전체 검색)
      // 영어 qa 옵션
      'Civil Service': '민원서류',
      Welfare: '복지',
      Housing: '주거',
      Medical: '의료',
      Jobs: '',
    };
    return s in map ? map[s] : s;
  };

  const handleSubmit = async () => {
    const userContext = { ...selections, lang, submitted_at: new Date().toISOString() };
    localStorage.setItem('final_context', JSON.stringify(userContext));

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: mapUserType(selections.type),
          age_group: mapAgeGroup(selections.age),
          category: mapCategory(selections.service),
          detail: selections.detail,
          lang,
          visa_type: ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('analyze_result', JSON.stringify(data));
      }
    } catch (e) { console.error('analyze 호출 실패:', e); }

    router.push('/list');
  };

  // --- 스타일 설정 ---
  const themeClass = isHighContrast ? "bg-black text-white" : "bg-white text-black";
  const cardClass = isHighContrast ? "border-2 border-white bg-black" : "border border-gray-300 bg-[#f0f7ff]";
  const buttonClass = isHighContrast ? "bg-[#FDC700] text-black" : "bg-[#009DFF] text-white";
  const buttonClass2 = isHighContrast ? "bg-[#FDC700] text-black" : "bg-[#004a99] text-white";
  const fontSizeClass = isLargeFont ? "text-[26px]" : "text-[18px]";
  const inputClass =  isHighContrast ? "bg-black border-white" : "bg-white border-gray-100";

  return (
    <div className={`min-h-screen flex flex-col items-center pb-10 transition-colors ${themeClass} relative`}>
      {/* 450px 컨테이너 안에서 상단 여백 pt-4로 다른 페이지와 통일 */}
      <div className="w-full max-w-[450px] px-6 pt-4 relative">
        
        {/* TopSettings: 저장 핸들러를 연결하여 설정 유지 */}
        <TopSettings 
          lang={lang} setLang={handleLang} 
          isHighContrast={isHighContrast} setIsHighContrast={handleContrast} 
          isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t} 
        />
        
        {/* 제목 섹션: 상단 아이콘들과 겹치지 않게 mt-12 적용 */}
        <div className="mt-12 mb-8">
          <h1 className={`${isLargeFont ? 'text-[44px]' : 'text-[38px]'} font-bold tracking-tighter`}>
            {t.title}
          </h1>
          <p className={`${isLargeFont ? 'text-[28px]' : 'text-[24px]'} font-bold opacity-90 mt-1`}>
            {t.step}
          </p>
        </div>

        {/* 메인 질문 카드 섹션 */}
        <main className="flex flex-col gap-6 items-center">
          {/* 유형 선택 카드 */}
          <section className={`w-full max-w-[380px] p-6 rounded-[15px] shadow-sm ${cardClass}`}>
            <h2 className="text-[32px] font-bold mb-1 leading-none">{t.q1}</h2>
            <p className="text-[20px] font-bold mb-4">{t.q1_text}</p>
            <div className={`p-4 rounded-sm flex flex-col gap-3 mb-6 border ${inputClass}`}>
              {t.types.map((option: string) => (
                <label key={option} className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="type" 
                    className={`w-5 h-5 ${isHighContrast ? "accent-[#FDC700]" : "accent-[#009DFF]"}`} 
                    checked={selections.type === option} 
                    onChange={() => handleSelect('type', option)} 
                  />
                  <span className={`${fontSizeClass} ${isHighContrast ? "text-white" : "text-black"} font-semibold`}>{option}</span>
                </label>
              ))}
            </div>
            <button onClick={handleStartVoice} className={`w-full h-[60px] rounded-[10px] text-[22px] font-bold shadow-md ${buttonClass}`}>
              {t.btnVoice}
            </button>
          </section>

          {/* 연령 및 서비스 선택 카드 */}
          {[ {id:'age', q:t.q2, txt:t.q2_text, ph:t.agePlaceholder}, {id:'service', q:t.q3, txt:t.q3_text, ph:t.servicePlaceholder} ].map((item) => (
            <section key={item.id} className={`w-full max-w-[380px] p-6 rounded-[15px] shadow-sm ${cardClass}`}>
              <h2 className="text-[32px] font-bold mb-1 leading-none">{item.q}</h2>
              <p className="text-[20px] font-bold mb-4">{item.txt}</p>
              <input 
                type="text" 
                readOnly 
                placeholder={item.ph} 
                className={`w-full h-[52px] p-4 rounded-[10px] border mb-5 outline-none ${isHighContrast ? "text-[#ffffff]" : "text-black"} cursor-pointer font-medium ${fontSizeClass} ${inputClass}`} 
                value={(selections as any)[item.id]} 
                onClick={() => { setModalType(item.id as any); setIsSelectModalOpen(true); }} 
              />
              <div className="flex gap-3">
                <button onClick={() => { setModalType(item.id as any); setIsSelectModalOpen(true); }} className={`flex-1 h-[55px] rounded-[10px] font-bold text-[20px] shadow-sm ${buttonClass}`}>
                  {t.btnSelect}
                </button>
                <button onClick={handleStartVoice} className={`flex-1 h-[55px] rounded-[10px] font-bold text-[20px] shadow-sm ${buttonClass}`}>
                  {t.btnVoice}
                </button>
              </div>
            </section>
          ))}

          {/* 상황 입력 카드 */}
          <section className={`w-full max-w-[380px] p-6 rounded-[15px] shadow-sm ${cardClass}`}>
            <h2 className="text-[32px] font-bold mb-1 leading-none">{t.q4}</h2>
            <p className="text-[20px] font-bold mb-4">{t.q4_text}</p>
            <textarea 
              placeholder={t.textareaPlaceholder} 
              className={`w-full h-[120px] p-4 rounded-[10px] border mb-5 resize-none outline-none ${isHighContrast ? "text-white" : "text-black"} font-medium ${fontSizeClass} ${inputClass}`} 
              value={selections.detail} 
              onChange={(e) => setSelections({...selections, detail: e.target.value})} 
            />
            <button onClick={handleStartVoice} className={`w-full h-[60px] rounded-[10px] text-[22px] font-bold shadow-md ${buttonClass}`}>
              {t.btnVoice}
            </button>
          </section>

          {/* 최종 제출 버튼 */}
          <button 
            onClick={handleSubmit} 
            className={`mt-8 w-full max-w-[380px] h-[75px] rounded-[10px] text-[32px] font-bold shadow-xl active:scale-[0.98] transition-all ${buttonClass2}`}
          >
            {t.btnSubmit}
          </button>
        </main>
      </div>

      {/* 모달 UI들은 기존과 동일 */}
      {isSelectModalOpen && modalType && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[200]">
          <div className="w-[85%] max-w-[350px]">
            <div className="bg-white border-2 border-gray-400 overflow-hidden shadow-2xl rounded-[20px]">
              <div className="p-5 text-center font-bold text-[24px] border-b-2 border-gray-300 text-black">{modalType === 'age' ? t.modalAge : t.modalService}</div>
              <ul className="max-h-[270px] overflow-y-auto">
                {t.options[modalType].map((item: string) => (
                  <li key={item} onClick={() => handleSelect(modalType, item)} className="p-4 text-center border-b border-gray-200 text-[22px] text-black active:bg-gray-100 cursor-pointer font-medium">{item}</li>
                ))}
              </ul>
            </div>
            <div className="mt-2 flex justify-center">
              <button onClick={() => setIsSelectModalOpen(false)} className="w-[200px] h-[60px] bg-white border-2 border-gray-400 text-[24px] font-bold text-black rounded-[7px] shadow-sm">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      <ChatFab isHighContrast={isHighContrast} label={lang === 'ko' ? '챗봇' : 'Chat'} />

      {isVoiceModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[300]">
          <div className="flex flex-col items-center gap-10">
            <div className="w-[280px] h-[280px] bg-white rounded-full flex flex-col items-center justify-center shadow-2xl animate-pulse">
              <p className="text-[34px] font-bold mb-6 text-black tracking-tighter">{t.voiceMain}</p>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={stopRecording} className="px-12 py-4 bg-[#009DFF] text-white rounded-full font-bold text-[24px] shadow-lg">{t.voiceSubmit}</button>
              <button onClick={() => setIsVoiceModalOpen(false)} className="text-[28px] font-bold text-red-600 opacity-80 uppercase">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}