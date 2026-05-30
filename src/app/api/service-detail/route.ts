import { NextResponse } from 'next/server';
import axios from 'axios';

// 챗봇 /service_detail 프록시 (LLM 생성 민원 상세)
// body: { service_name, lang?, user_type? }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await axios.post(
      `${process.env.AI_API_URL}/service_detail`,
      body,
      { timeout: 60_000 }
    );
    return NextResponse.json(res.data, { status: 200 });
  } catch (err: any) {
    console.error('AI /service_detail error:', err.message);
    return NextResponse.json(
      { error: 'AI 서버 오류', detail: err.response?.data?.detail ?? err.message },
      { status: err.response?.status ?? 500 }
    );
  }
}
