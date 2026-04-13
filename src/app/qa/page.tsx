'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopSettings from '../components/TopSettings';

export default function QaPage() {
  const router = useRouter();
  
  // --- 상태 관리 ---
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [selections, setSelections] = useState({ type: '', age: '', service: '', detail: '' });
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'age' | 'service' | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // --- 음성 녹음 관련 Ref ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = {
    ko: {
      title: "민원 찾기", step: "진행사항", langText: "한/영변환", highContrast: "고대비모드", largeFont: "큰글씨모드",
      q1: "1.", q1_text: "유형이 어떻게 되시나요?", q2: "2.", q2_text: "연령대가 어떻게 되나요?",
      q3: "3.", q3_text: "필요한 서비스는 무엇인가요?", q4: "4.", q4_text: "무슨 상황인가요?",
      types: ['외국인', '노인 (65세 이상)', '저소득층', '해당없음'],
      options: { age: ['10대', '20대', '30대', '40대', '50대', '60대 이상'], service: ['민원', '복지', '주거', '의료', '일자리'] },
      agePlaceholder: "연령을 선택해주세요", servicePlaceholder: "서비스를 선택해주세요", textareaPlaceholder: "상황을 입력하거나 음성으로 말씀해주세요",
      btnSelect: "입력 선택", btnVoice: "음성 인식", btnSubmit: "입력 완료",
      cancel: "취소", modalAge: "연령 입력", modalService: "서비스 입력", voiceMain: "말해주세요", voiceSubmit: "말하기 완료 (전송)"
    },
    en: {
      title: "Public Service", step: "Progress", langText: "KO/EN", highContrast: "Contrast", largeFont: "BigFont",
      q1: "1.", q1_text: "What is your type?", q2: "2.", q2_text: "How old are you?",
      q3: "3.", q3_text: "What service do you need?", q4: "4.", q4_text: "What is the situation?",
      types: ['Foreigner', 'Senior', 'Low Income', 'N/A'],
      options: { age: ['10s', '20s', '30s', '40s', '50s', '60s or older'], service: ['Civil Service', 'Welfare', 'Housing', 'Medical', 'Jobs'] },
      agePlaceholder: "Select Age", servicePlaceholder: "Select Service", textareaPlaceholder: "Enter situation or speak",
      btnSelect: "Select", btnVoice: "Voice", btnSubmit: "Complete",
      cancel: "Cancel", modalAge: "Age Input", modalService: "Service Input", voiceMain: "Please speak", voiceSubmit: "Finish (Send)"
    }
  }[lang] as any;

  // --- [백엔드 통로 1] 페이지 진입 시 세션 복원 (GET) ---
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // '/api/v1/questions/session/user_id' 실제 세션 조회 주소로 변경 필요
        const response = await fetch('/api/v1/questions/session/current-user');
        if (response.ok) {
          const data = await response.json();
          if (data.answer_json) setSelections(data.answer_json);
        }
      } catch (e) { console.log("진행 중인 세션 없음"); }
    };
    fetchSession();
  }, []);

  // --- [백엔드 통로 2] 음성 인식 및 AI 전송 (STT) ---
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
    try {
      // '/api/v1/stt' 실제 백엔드 STT API 주소로 변경 필요
      const response = await fetch('/api/v1/stt', { method: 'POST', body: formData });
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

  // --- [백엔드 통로 3] 데이터 선택 및 최종 제출 ---
  const handleSelect = (category: string, value: string) => {
    setSelections(prev => ({ ...prev, [category]: value }));
    setIsSelectModalOpen(false);
  };

  const handleSubmit = async () => {
    const userContext = JSON.stringify({ ...selections, lang, submitted_at: new Date().toISOString() });
    console.log("최종 전송 데이터:", userContext);
    
    try {
      // '/api/v1/user-context' 실제 최종 제출 API 주소로 변경 필요
      await fetch('/api/v1/user-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: userContext
      });
    } catch (e) { console.log("서버 제출 오류"); }
    
    localStorage.setItem('final_context', userContext);
    router.push('/loading');
  };

  const themeClass = isHighContrast ? "bg-black text-white" : "bg-white text-black";
  const cardClass = isHighContrast ? "border-2 border-yellow-400 bg-black" : "border border-gray-300 bg-[#f0f7ff]";
  const buttonClass = isHighContrast ? "bg-[#FDC700] text-black" : "bg-[#009DFF] text-white";
  const buttonClass2 = isHighContrast ? "bg-[#FDC700] text-black" : "bg-[#004a99] text-white";
  const fontSizeClass = isLargeFont ? "text-[26px]" : "text-[18px]";

  return (
    <div className={`min-h-screen flex flex-col items-center pb-10 transition-colors ${themeClass} relative`}>
      <div className="w-full max-w-[450px] relative pt-14">
        <TopSettings lang={lang} setLang={setLang} isHighContrast={isHighContrast} setIsHighContrast={setIsHighContrast} isLargeFont={isLargeFont} setIsLargeFont={setIsLargeFont} t={t} />
        <div className="px-5 mb-8">
          <h1 className={`${isLargeFont ? 'text-[44px]' : 'text-[38px]'} font-bold tracking-tighter`}>{t.title}</h1>
          <p className={`${isLargeFont ? 'text-[28px]' : 'text-[24px]'} font-bold opacity-90`}>{t.step}</p>
        </div>
      </div>

      <main className="w-full max-w-[360px] flex flex-col gap-5">
        <section className={`p-6 rounded-md shadow-sm ${cardClass}`}>
          <h2 className="text-[32px] font-bold mb-1 leading-none">{t.q1}</h2>
          <p className="text-[20px] font-bold mb-4">{t.q1_text}</p>
          <div className="bg-white p-4 rounded-sm flex flex-col gap-3 mb-6 border border-gray-100 shadow-inner">
            {t.types.map((option: string) => (
              <label key={option} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="type" className="w-5 h-5 accent-[#009DFF]" checked={selections.type === option} onChange={() => handleSelect('type', option)} />
                <span className={`${fontSizeClass} text-black font-semibold`}>{option}</span>
              </label>
            ))}
          </div>
          <button onClick={handleStartVoice} className={`w-full h-[60px] rounded-[10px] text-[22px] font-bold shadow-md ${buttonClass}`}>{t.btnVoice}</button>
        </section>

        {[ {id:'age', q:t.q2, txt:t.q2_text, ph:t.agePlaceholder}, {id:'service', q:t.q3, txt:t.q3_text, ph:t.servicePlaceholder} ].map((item) => (
          <section key={item.id} className={`p-6 rounded-md shadow-sm ${cardClass}`}>
            <h2 className="text-[32px] font-bold mb-1 leading-none">{item.q}</h2>
            <p className="text-[20px] font-bold mb-4">{item.txt}</p>
            <input type="text" readOnly placeholder={item.ph} className={`w-full h-[52px] p-4 rounded-[10px] border border-gray-200 mb-5 outline-none bg-white text-black cursor-pointer font-medium ${fontSizeClass}`} value={(selections as any)[item.id]} onClick={() => { setModalType(item.id as any); setIsSelectModalOpen(true); }} />
            <div className="flex gap-3">
              <button onClick={() => { setModalType(item.id as any); setIsSelectModalOpen(true); }} className={`flex-1 h-[55px] rounded-[10px] font-bold text-[20px] shadow-sm ${buttonClass}`}>{t.btnSelect}</button>
              <button onClick={handleStartVoice} className={`flex-1 h-[55px] rounded-[10px] font-bold text-[20px] shadow-sm ${buttonClass}`}>{t.btnVoice}</button>
            </div>
          </section>
        ))}

        <section className={`p-6 rounded-md shadow-sm ${cardClass}`}>
          <h2 className="text-[32px] font-bold mb-1 leading-none">{t.q4}</h2>
          <p className="text-[20px] font-bold mb-4">{t.q4_text}</p>
          <textarea placeholder={t.textareaPlaceholder} className={`w-full h-[120px] p-4 rounded-[10px] border border-gray-200 mb-5 resize-none outline-none bg-white text-black font-medium ${fontSizeClass}`} value={selections.detail} onChange={(e) => setSelections({...selections, detail: e.target.value})} />
          <button onClick={handleStartVoice} className={`w-full h-[60px] rounded-[10px] text-[22px] font-bold shadow-md ${buttonClass}`}>{t.btnVoice}</button>
        </section>

        <button onClick={handleSubmit} className={`mt-6 w-full h-[80px] rounded-[15px] text-[32px] font-bold shadow-xl active:scale-[0.98] transition-all ${buttonClass2}`}>{t.btnSubmit}</button>
      </main>

      {/* 모달 UI 및 음성 모달 (이전과 동일) */}
      {isSelectModalOpen && modalType && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[200]">
          <div className="w-[85%] max-w-[320px]">
            <div className="bg-white border-2 border-gray-400 overflow-hidden shadow-2xl rounded-[10px]">
              <div className="p-5 text-center font-bold text-[24px] border-b-2 border-gray-300 text-black">{modalType === 'age' ? t.modalAge : t.modalService}</div>
              <ul className="max-h-[300px] overflow-y-auto">
                {t.options[modalType].map((item: string) => (
                  <li key={item} onClick={() => handleSelect(modalType, item)} className="p-5 text-center border-b border-gray-200 text-[22px] text-black active:bg-gray-100 cursor-pointer font-medium">{item}</li>
                ))}
              </ul>
            </div>
            <div className="mt-5 flex justify-center">
              <button onClick={() => setIsSelectModalOpen(false)} className="w-[120px] h-[60px] bg-[#D9D9D9] border-2 border-gray-400 text-[24px] font-bold text-black rounded-[7px] shadow-sm">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

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