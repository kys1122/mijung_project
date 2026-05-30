import { NextResponse } from 'next/server';
import axios from 'axios';

// 챗봇의 GET /questions/start 프록시
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') ?? 'ko';
    const res = await axios.get(
      `${process.env.AI_API_URL}/questions/start`,
      { params: { lang }, timeout: 30_000 }
    );
    return NextResponse.json(res.data, { status: 200 });
  } catch (err: any) {
    console.error('AI /questions/start error:', err.message);
    return NextResponse.json(
      { error: 'AI 서버 오류', detail: err.response?.data?.detail ?? err.message },
      { status: err.response?.status ?? 500 }
    );
  }
}
