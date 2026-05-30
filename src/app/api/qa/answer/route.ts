import { NextResponse } from 'next/server';
import axios from 'axios';

// 챗봇의 POST /questions/answer 프록시
// body: { question_id, answer_value, session_id?, user_token?, lang? }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await axios.post(
      `${process.env.AI_API_URL}/questions/answer`,
      body,
      { timeout: 30_000 }
    );
    return NextResponse.json(res.data, { status: 200 });
  } catch (err: any) {
    console.error('AI /questions/answer error:', err.message);
    return NextResponse.json(
      { error: 'AI 서버 오류', detail: err.response?.data?.detail ?? err.message },
      { status: err.response?.status ?? 500 }
    );
  }
}
