export const STRINGS = {
  ko: {
    back: "민원 절차 화면으로",
    docsFallback: "필요한 서류 보기",
    need: "필요 서류",
    read: "자세히보기",
    done: "완료",
    issuer: "발급기관",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
  },
  en: {
    back: "Back",
    docsFallback: "Required Docs",
    need: "required documents",
    read: "Read more",
    done: "Done",
    issuer: "Issuer",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "Big Font",
  },
} as const;

export type DocumentStrings = typeof STRINGS.ko;
