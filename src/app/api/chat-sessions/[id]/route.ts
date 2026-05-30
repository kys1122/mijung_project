import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

async function loadSession(userId: number, sessionId: number) {
  const rows = await executeQuery(
    'SELECT id, user_id, title, created_at, updated_at FROM mijung_chat_sessions WHERE id = ?',
    [sessionId]
  );
  if (!rows || rows.length === 0) return null;
  if (String(rows[0].user_id) !== String(userId)) return 'forbidden' as const;
  return rows[0];
}

// 세션 + 메시지 조회
export async function GET(
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
    const session = await loadSession(userId, sessionId);
    if (!session) return NextResponse.json({ success: false, message: '세션 없음' }, { status: 404 });
    if (session === 'forbidden') return NextResponse.json({ success: false, message: '권한 없음' }, { status: 403 });

    const messages = await executeQuery(
      'SELECT role, content, created_at FROM mijung_chat_messages WHERE session_id = ? ORDER BY id ASC',
      [sessionId]
    );

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      messages,
    });
  } catch (error) {
    console.error('세션 조회 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// 세션 삭제
export async function DELETE(
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
    const session = await loadSession(userId, sessionId);
    if (!session) return NextResponse.json({ success: false, message: '세션 없음' }, { status: 404 });
    if (session === 'forbidden') return NextResponse.json({ success: false, message: '권한 없음' }, { status: 403 });

    await executeQuery('DELETE FROM mijung_chat_sessions WHERE id = ?', [sessionId]);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('세션 삭제 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
