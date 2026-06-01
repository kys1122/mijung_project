import { NextResponse } from 'next/server';
import axios from 'axios';
import { cachedTranslateBatch } from '@/lib/translate-cache';

/**
 * 상황 → 민원 매칭 프록시
 * POST /api/analyze
 * Body: { user_type, age_group?, category?, detail, lang?, visa_type? }
 *
 * 챗봇 백엔드 RAG는 한국어 기반. 입력 lang이 한국어가 아니면 detail을 자동으로 한국어로 번역해서 백엔드에 보냄.
 * (한국어 옵션 라벨 user_type/age_group/category는 클라이언트가 그대로 보냄 — 번역 X)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lang: string = String(body?.lang ?? 'ko');
    const detail: string = String(body?.detail ?? '');

    let koDetail = detail;
    if (lang !== 'ko' && detail) {
      try {
        const translated = await cachedTranslateBatch([detail], 'ko', lang);
        koDetail = translated[0] || detail;
      } catch (e) {
        console.error('detail 한국어 변환 실패:', e);
      }
    }

    const res = await axios.post(
      `${process.env.AI_API_URL}/analyze`,
      { ...body, detail: koDetail, lang: 'ko' }, // 매칭은 항상 한국어로
      { timeout: 60_000 }
    );
    return NextResponse.json({ ...res.data, _query_translated: lang !== 'ko' && koDetail !== detail ? koDetail : undefined }, { status: 200 });
  } catch (err: any) {
    const status = err.response?.status ?? 500;
    if (status === 429) {
      return NextResponse.json({ error: '잠시 후 다시 시도해주세요' }, { status: 429 });
    }
    console.error('AI /analyze error:', err.message);
    return NextResponse.json(
      { error: 'AI 서버 오류', detail: err.response?.data?.detail ?? err.message },
      { status }
    );
  }
}
