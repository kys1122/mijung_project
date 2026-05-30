import { NextResponse } from 'next/server';
import axios from 'axios';

// 챗봇 /checklist 프록시 (LLM 생성 체크리스트)
// mijung의 DB 기반 /api/checklist/[id]와 구분하기 위해 이름 변경
// body: { service_name, lang?, user_type? }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await axios.post(
      `${process.env.AI_API_URL}/checklist`,
      body,
      { timeout: 60_000 }
    );
    return NextResponse.json(res.data, { status: 200 });
  } catch (err: any) {
    console.error('AI /checklist error:', err.message);
    return NextResponse.json(
      { error: 'AI 서버 오류', detail: err.response?.data?.detail ?? err.message },
      { status: err.response?.status ?? 500 }
    );
  }
}
