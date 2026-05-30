import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

// 세션에 메시지 1개 추가
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });
    }
    const { id } = await params;
    const sessionId = Number(id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ success: false, message: '잘못된 세션 ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const role = body?.role;
    const content = body?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ success: false, message: '잘못된 요청' }, { status: 400 });
    }

    // 권한 확인 (세션 소유자인가?)
    const sessRows = await executeQuery(
      'SELECT user_id, title FROM mijung_chat_sessions WHERE id = ?',
      [sessionId]
    );
    if (!sessRows || sessRows.length === 0) {
      return NextResponse.json({ success: false, message: '세션 없음' }, { status: 404 });
    }
    if (String(sessRows[0].user_id) !== String(userId)) {
      return NextResponse.json({ success: false, message: '권한 없음' }, { status: 403 });
    }

    // 메시지 저장
    await executeQuery(
      'INSERT INTO mijung_chat_messages (session_id, role, content) VALUES (?, ?, ?)',
      [sessionId, role, content]
    );

    // 첫 user 메시지면 세션 제목 자동 설정 (현재 제목이 기본값이면)
    if (role === 'user' && sessRows[0].title === '새 대화') {
      const newTitle = content.trim().slice(0, 50);
      await executeQuery(
        'UPDATE mijung_chat_sessions SET title = ? WHERE id = ?',
        [newTitle, sessionId]
      );
    } else {
      // updated_at 갱신용 트리거
      await executeQuery(
        'UPDATE mijung_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [sessionId]
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('메시지 저장 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
