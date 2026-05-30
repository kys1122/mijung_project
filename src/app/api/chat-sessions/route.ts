import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

// 사용자의 모든 챗 세션 목록 조회
export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });
    }
    const rows = await executeQuery(
      `SELECT s.id, s.title, s.created_at, s.updated_at,
              (SELECT COUNT(*) FROM mijung_chat_messages m WHERE m.session_id = s.id) AS message_count
         FROM mijung_chat_sessions s
        WHERE s.user_id = ?
        ORDER BY s.updated_at DESC`,
      [String(userId)]
    );
    return NextResponse.json({
      success: true,
      sessions: rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        created_at: r.created_at,
        updated_at: r.updated_at,
        message_count: Number(r.message_count),
      })),
    });
  } catch (error) {
    console.error('세션 목록 조회 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// 새 챗 세션 생성
export async function POST(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : '새 대화';
    const result: any = await executeQuery(
      'INSERT INTO mijung_chat_sessions (user_id, title) VALUES (?, ?)',
      [String(userId), title]
    );
    return NextResponse.json({ success: true, session: { id: result.insertId, title } }, { status: 200 });
  } catch (error) {
    console.error('세션 생성 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
