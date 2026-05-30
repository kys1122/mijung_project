export type VisaOption = {
  code: string;          // 서버에 전송될 코드 ('' = 미지정, 'OTHER' = 사용자 자유 입력 모드)
  label_ko: string;
  label_en: string;
};

export const COMMON_VISAS: VisaOption[] = [
  { code: '',     label_ko: '미지정', label_en: 'Unspecified' },
  { code: 'E-9',  label_ko: 'E-9 비전문취업', label_en: 'E-9 Non-professional Employment' },
  { code: 'H-2',  label_ko: 'H-2 방문취업',   label_en: 'H-2 Working Visit' },
  { code: 'F-4',  label_ko: 'F-4 재외동포',   label_en: 'F-4 Overseas Korean' },
  { code: 'F-5',  label_ko: 'F-5 영주',       label_en: 'F-5 Permanent Resident' },
  { code: 'F-6',  label_ko: 'F-6 결혼이민',   label_en: 'F-6 Marriage Migration' },
  { code: 'D-2',  label_ko: 'D-2 유학',       label_en: 'D-2 Student' },
  { code: 'D-4',  label_ko: 'D-4 일반연수',   label_en: 'D-4 General Training' },
  { code: 'E-2',  label_ko: 'E-2 회화지도',   label_en: 'E-2 Foreign Language Instructor' },
  { code: 'OTHER', label_ko: '기타 (직접 입력)', label_en: 'Other (specify)' },
];

/** 사용자가 입력한 raw 문자열을 서버가 인식할 형식으로 정규화 */
export function normalizeVisa(raw: string): string {
  if (!raw) return '';
  // 'f5' / 'F5' / 'F-5' / 'f-5' → 'F-5'
  const m = raw.trim().toUpperCase().match(/^([A-Z])-?(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  return raw.trim();
}
