export const STRINGS = {
  ko: {
    title: "민원 선택",
    sub: "사용하실 민원을 선택해주세요.",
    btn: "민원 절차 보기",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
    chatLabel: "챗봇",
  },
  en: {
    title: "Service Selection",
    sub: "Please select a service.",
    btn: "View Procedure",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "BigFont",
    chatLabel: "Chat",
  },
} as const;

export type ListStrings = typeof STRINGS.ko;
