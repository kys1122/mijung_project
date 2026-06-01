import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

// POST /api/users/me/password { current, next } — 비밀번호 변경
export async function POST(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

    const body = await request.json();
    const current = typeof body?.current === 'string' ? body.current : '';
    const next = typeof body?.next === 'string' ? body.next : '';

    if (!current) return NextResponse.json({ success: false, message: '현재 비밀번호를 입력해주세요' }, { status: 400 });
    if (next.length < 8) return NextResponse.json({ success: false, message: '새 비밀번호는 8자 이상' }, { status: 400 });

    const rows = await executeQuery('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return NextResponse.json({ success: false, message: '사용자 없음' }, { status: 404 });

    const ok = await bcrypt.compare(current, rows[0].password_hash);
    if (!ok) return NextResponse.json({ success: false, message: '현재 비밀번호가 맞지 않아요' }, { status: 401 });

    const sameAsCurrent = await bcrypt.compare(next, rows[0].password_hash);
    if (sameAsCurrent) return NextResponse.json({ success: false, message: '새 비밀번호는 현재와 달라야 해요' }, { status: 400 });

    const newHash = await bcrypt.hash(next, 10);
    await executeQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
