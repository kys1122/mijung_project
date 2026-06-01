// 민원 카테고리 분류 + 컬러 매핑
// 챗봇 options.categories의 8가지에 맞춰 시각 토큰 부여.

export type Category =
  | 'welfare'
  | 'medical'
  | 'housing'
  | 'immigration'
  | 'education'
  | 'living'
  | 'documents'
  | 'other';

type CategoryMeta = {
  label: string;
  label_en: string;
  emoji: string;
  bg: string;
  text: string;
  bar: string;
  ring: string;
};

export function categoryLabel(meta: CategoryMeta, lang: string) {
  return lang === 'ko' ? meta.label : meta.label_en;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  welfare:     { label: '복지',     label_en: 'Welfare',     emoji: '🤝', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', ring: 'border-emerald-200' },
  medical:     { label: '의료',     label_en: 'Medical',     emoji: '🏥', bg: 'bg-rose-50',    text: 'text-rose-700',    bar: 'bg-rose-500',    ring: 'border-rose-200' },
  housing:     { label: '주거',     label_en: 'Housing',     emoji: '🏠', bg: 'bg-amber-50',   text: 'text-amber-800',   bar: 'bg-amber-500',   ring: 'border-amber-200' },
  immigration: { label: '출입국',   label_en: 'Immigration', emoji: '✈️', bg: 'bg-violet-50',  text: 'text-violet-700',  bar: 'bg-violet-500',  ring: 'border-violet-200' },
  education:   { label: '교육·문화', label_en: 'Education',   emoji: '📚', bg: 'bg-sky-50',     text: 'text-sky-700',     bar: 'bg-sky-500',     ring: 'border-sky-200' },
  living:      { label: '생활지원', label_en: 'Daily life',  emoji: '🧺', bg: 'bg-teal-50',    text: 'text-teal-700',    bar: 'bg-teal-500',    ring: 'border-teal-200' },
  documents:   { label: '민원서류', label_en: 'Documents',   emoji: '📄', bg: 'bg-slate-100',  text: 'text-slate-700',   bar: 'bg-slate-400',   ring: 'border-slate-300' },
  other:       { label: '기타',     label_en: 'Other',       emoji: '🔖', bg: 'bg-indigo-50',  text: 'text-indigo-700',  bar: 'bg-indigo-500',  ring: 'border-indigo-200' },
};

/** chatbot category 문자열 → Category */
export function fromChatbotCategory(raw?: string | null): Category {
  if (!raw) return 'other';
  if (raw.includes('복지')) return 'welfare';
  if (raw.includes('의료')) return 'medical';
  if (raw.includes('주거') || raw.includes('주택')) return 'housing';
  if (raw.includes('출입국') || raw.includes('외국인') || raw.includes('비자')) return 'immigration';
  if (raw.includes('교육') || raw.includes('문화')) return 'education';
  if (raw.includes('생활')) return 'living';
  if (raw.includes('민원') || raw.includes('서류')) return 'documents';
  return 'other';
}

/** name/ministry/department 텍스트로 카테고리 추론 */
export function inferCategory(input: {
  name?: string | null;
  ministry?: string | null;
  department?: string | null;
  category?: string | null;
}): Category {
  if (input.category) {
    const cat = fromChatbotCategory(input.category);
    if (cat !== 'other') return cat;
  }
  const text = `${input.ministry ?? ''} ${input.department ?? ''} ${input.name ?? ''}`;

  if (/외국인|비자|체류|법무부|출입국|난민|귀화/.test(text)) return 'immigration';
  if (/건강|의료|보험.{0,3}공단|병원|진료|약제|치과|인공관절|수술|간호|장애/.test(text)) return 'medical';
  if (/주택|임대|주거|국토교통부|월세|전세|보금자리|행복주택/.test(text)) return 'housing';
  if (/교육|장학|학생|교육부|문화|학습|학자금|교과/.test(text)) return 'education';
  if (/복지|연금|수당|보훈|보건복지|기초.{0,3}생활|돌봄|아동|노인|장애인 활동/.test(text)) return 'welfare';
  if (/생활|에너지|난방|급여 지원/.test(text)) return 'living';
  if (/증명서|발급|민원|등본|초본|확인서/.test(text)) return 'documents';
  return 'other';
}

export function getCategoryMeta(input: {
  name?: string | null;
  ministry?: string | null;
  department?: string | null;
  category?: string | null;
}): CategoryMeta & { key: Category } {
  const key = inferCategory(input);
  return { ...CATEGORY_META[key], key };
}
