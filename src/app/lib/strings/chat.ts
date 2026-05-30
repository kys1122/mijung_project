export const STRINGS = {
  ko: {
    title: "챗봇 상담",
    back: "뒤로",
    placeholder: "무엇이든 물어보세요",
    send: "전송",
    micPermission: "마이크 권한이 필요합니다.",
    failResponse: "응답을 받지 못했습니다.",
    failServer: "AI 서버와 통신에 실패했습니다.",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
  },
  en: {
    title: "Chat",
    back: "Back",
    placeholder: "Ask me anything",
    send: "Send",
    micPermission: "Microphone permission required.",
    failResponse: "No response received.",
    failServer: "Failed to reach AI server.",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "Big Font",
  },
} as const;

export type ChatStrings = typeof STRINGS.ko;
