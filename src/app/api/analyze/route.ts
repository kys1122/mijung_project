import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * 상황 → 민원 매칭 프록시
 * POST /api/analyze
 * Body: { user_type, age_group?, category?, detail, lang?, visa_type? }
 * UI_INTEGRATION_GUIDE.md §4-2
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await axios.post(
      `${process.env.AI_API_URL}/analyze`,
      body,
      { timeout: 60_000 }
    );
    return NextResponse.json(res.data, { status: 200 });
  } catch (err: any) {
    const status = err.response?.status ?? 500;
    if (status === 429) {
      return NextResponse.json(
        { error: '잠시 후 다시 시도해주세요' },
        { status: 429 }
      );
    }
    console.error('AI /analyze error:', err.message);
    return NextResponse.json(
      { error: 'AI 서버 오류', detail: err.response?.data?.detail ?? err.message },
      { status }
    );
  }
}
