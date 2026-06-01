import { NextResponse } from 'next/server';
import { cachedTranslateBatch } from '@/lib/translate-cache';

/**
 * UI 텍스트 일괄 번역 — POST /api/ui-translate
 * Body: { texts: string[], lang: string, source_lang?: string }
 * 한국어 텍스트들을 lang으로 일괄 번역 (캐싱 포함).
 * lang === source_lang 이면 원문 그대로 반환.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const texts: string[] = Array.isArray(body?.texts) ? body.texts.map(String) : [];
    const lang = String(body?.lang ?? 'ko');
    const sourceLang = String(body?.source_lang ?? 'ko');

    if (texts.length === 0) return NextResponse.json({ success: true, translations: {} });

    const translated = await cachedTranslateBatch(texts, lang, sourceLang);
    const map: Record<string, string> = {};
    for (let i = 0; i < texts.length; i++) {
      map[texts[i]] = translated[i] ?? texts[i];
    }
    return NextResponse.json({ success: true, lang, translations: map });
  } catch (err) {
    console.error('ui-translate 오류:', err);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
