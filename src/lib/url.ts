// 공식 사이트/링크 정규화. DB·LLM이 종종 도메인 대신 "정부24" 같은
// 한글 명칭을 그대로 내려보내거나, 끝에 마침표/괄호를 붙여 보내서 깨진 URL을 만든다.

const KOREAN_LABEL_TO_URL: Record<string, string> = {
  '정부24': 'https://www.gov.kr',
  '정부 24': 'https://www.gov.kr',
  '복지로': 'https://www.bokjiro.go.kr',
  '국민건강보험': 'https://www.nhis.or.kr',
  '국세청': 'https://www.nts.go.kr',
  '홈택스': 'https://www.hometax.go.kr',
  '4대보험정보연계센터': 'https://www.4insure.or.kr',
  '근로복지공단': 'https://www.comwel.or.kr',
  '국민연금공단': 'https://www.nps.or.kr',
};

const TRAILING_PUNCT = /[.,;:!?。，；：！？)\]}"'“”‘’]+$/;

/**
 * 입력값이 실제 URL로 클릭 가능한 형태인지 판단.
 * - 한글이 포함되어 있으면 false (잘못 매칭된 텍스트)
 * - 점/슬래시가 전혀 없으면 false
 */
export function isLikelyUrl(s: string): boolean {
  if (!s) return false;
  if (/[가-힣ㄱ-ㆎ]/.test(s)) return false; // 한글
  if (!/[./]/.test(s)) return false;
  return /^(https?:\/\/|www\.)|\.[a-z]{2,}/.test(s);
}

/**
 * raw 링크를 표준화된 절대 URL로 변환. 변환할 수 없으면 null.
 */
export function normalizeOfficialLink(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(TRAILING_PUNCT, '');
  if (!trimmed) return null;

  // 한글 명칭 매핑
  for (const [label, url] of Object.entries(KOREAN_LABEL_TO_URL)) {
    if (trimmed.includes(label)) return url;
  }

  if (!isLikelyUrl(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/** RichTextRenderer가 매칭한 raw URL 토큰을 정리. trailing 문장부호 제거. */
export function trimTrailingPunct(url: string): string {
  return url.replace(TRAILING_PUNCT, '');
}
