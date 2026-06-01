import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

// POST /api/chat-feedback { message_id?, session_id?, rating: 'up'|'down', comment? }
// 같은 (user, message)는 한 번만 — 다시 누르면 rating 갱신
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  try {
    const body = await request.json();
    const rating = body?.rating;
    if (rating !== 'up' && rating !== 'down') {
      return NextResponse.json({ success: false, message: 'rating은 up 또는 down' }, { status: 400 });
    }
    const messageId = body?.message_id ? Number(body.message_id) : null;
    const sessionId = body?.session_id ? Number(body.session_id) : null;
    const comment = typeof body?.comment === 'string' ? body.comment.slice(0, 500) : null;

    if (messageId) {
      await executeQuery(
        `INSERT INTO mijung_chat_feedback (user_id, session_id, message_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), created_at = CURRENT_TIMESTAMP`,
        [userId, sessionId, messageId, rating, comment]
      );
    } else {
      await executeQuery(
        `INSERT INTO mijung_chat_feedback (user_id, session_id, message_id, rating, comment)
         VALUES (?, ?, NULL, ?, ?)`,
        [userId, sessionId, rating, comment]
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('chat-feedback POST 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
