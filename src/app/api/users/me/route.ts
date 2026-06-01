import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });
    }
    const rows = await executeQuery(
      'SELECT id, email, name, provider, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, message: '사용자 없음' }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('현재 사용자 조회 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// PATCH /api/users/me { name } — 이름 변경
export async function PATCH(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 50) {
      return NextResponse.json({ success: false, message: '이름은 1~50자' }, { status: 400 });
    }
    await executeQuery('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('사용자 정보 수정 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// DELETE /api/users/me — 회원 탈퇴
export async function DELETE(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('회원 탈퇴 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
