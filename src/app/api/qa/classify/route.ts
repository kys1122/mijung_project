import { NextResponse } from 'next/server';
import axios from 'axios';

// 챗봇의 POST /classify 프록시
// body: { context: answers JSON, session_id? }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await axios.post(
      `${process.env.AI_API_URL}/classify`,
      body,
      { timeout: 60_000 }
    );
    return NextResponse.json(res.data, { status: 200 });
  } catch (err: any) {
    console.error('AI /classify error:', err.message);
    return NextResponse.json(
      { error: 'AI 서버 오류', detail: err.response?.data?.detail ?? err.message },
      { status: err.response?.status ?? 500 }
    );
  }
}
