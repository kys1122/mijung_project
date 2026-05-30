import { NextResponse } from 'next/server';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { flatten, unflatten } from '@/app/lib/i18n-utils';
import { STRINGS as QA_STRINGS } from '@/app/lib/strings/qa';
import { STRINGS as LIST_STRINGS } from '@/app/lib/strings/list';
import { STRINGS as PROC_STRINGS } from '@/app/lib/strings/procedure';
import { STRINGS as DOC_STRINGS } from '@/app/lib/strings/document';
import { STRINGS as CHAT_STRINGS } from '@/app/lib/strings/chat';
import { isSupported } from '@/app/lib/languages';

const SOURCES: Record<string, { ko: unknown; en: unknown }> = {
  qa: QA_STRINGS,
  list: LIST_STRINGS,
  procedure: PROC_STRINGS,
  document: DOC_STRINGS,
  chat: CHAT_STRINGS,
};

const CACHE_DIR = path.join(process.cwd(), '.cache', 'i18n');

/**
 * 페이지별 UI 문자열을 지정 언어로 반환.
 * ko/en은 즉시, 그 외는 디스크 캐시 → /translate_batch.
 *
 * GET /api/i18n?page=qa&lang=vi
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '';
  const lang = searchParams.get('lang') ?? '';

  if (!(page in SOURCES)) {
    return NextResponse.json({ error: 'unknown page' }, { status: 400 });
  }
  if (!lang || !isSupported(lang)) {
    return NextResponse.json({ error: 'unsupported lang' }, { status: 400 });
  }

  const source = SOURCES[page] as { ko: any; en: any };

  if (lang === 'ko') return NextResponse.json(source.ko);
  if (lang === 'en') return NextResponse.json(source.en);

  const cachePath = path.join(CACHE_DIR, `${page}_${lang}.json`);

  // 1) 디스크 캐시 히트
  try {
    const raw = await fs.readFile(cachePath, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    /* 캐시 미스 */
  }

  // 2) 챗봇 /translate_batch 호출
  try {
    const flat = flatten(source.en);
    const aiRes = await axios.post(
      `${process.env.AI_API_URL}/translate_batch`,
      { texts: flat, target_lang: lang },
      { timeout: 60_000 },
    );
    const translatedFlat = aiRes.data?.translated;
    if (!translatedFlat || typeof translatedFlat !== 'object') {
      throw new Error('invalid translated payload');
    }

    const result = unflatten(translatedFlat as Record<string, string>, source.en);

    // 3) 디스크 캐시 저장 (실패해도 응답은 반환)
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(result, null, 2), 'utf-8');
    } catch (e) {
      console.warn('i18n cache write 실패(무시):', (e as Error).message);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('AI /translate_batch 실패:', err.message);
    // 폴백: en 그대로 반환 (UI가 멈추지 않게)
    return NextResponse.json(source.en, { status: 200 });
  }
}
