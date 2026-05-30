export const STRINGS = {
  ko: {
    back: "민원 선택으로",
    progress: "진행률",
    docs: "필요한 서류 보기",
    web: "사이트 바로가기",
    voice: "음성으로 듣기",
    voicePlaying: "재생 중...",
    done: "완료",
    loading: "로딩 중...",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
  },
  en: {
    back: "Back",
    progress: "Progress",
    docs: "Required Docs",
    web: "Website",
    voice: "Listen",
    voicePlaying: "Playing...",
    done: "Done",
    loading: "Loading...",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "Big Font",
  },
} as const;

export type ProcedureStrings = typeof STRINGS.ko;
