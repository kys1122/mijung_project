import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

// PATCH /api/delegations/:id { status: 'active'|'revoked' } — 대리인이 수락/거부, 또는 owner가 revoke
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  try {
    const { id } = await params;
    const rowId = Number(id);
    const body = await request.json();
    const status = body?.status;
    if (status !== 'active' && status !== 'revoked') {
      return NextResponse.json({ success: false, message: 'status는 active 또는 revoked' }, { status: 400 });
    }

    const rows = await executeQuery(
      `SELECT owner_user_id, delegate_user_id, status FROM mijung_delegations WHERE id = ? LIMIT 1`,
      [rowId]
    );
    if (rows.length === 0) return NextResponse.json({ success: false, message: '관계 없음' }, { status: 404 });
    const row = rows[0];
    const isOwner = Number(row.owner_user_id) === userId;
    const isDelegate = Number(row.delegate_user_id) === userId;
    if (!isOwner && !isDelegate) {
      return NextResponse.json({ success: false, message: '권한 없음' }, { status: 403 });
    }
    // delegate는 pending → active/revoked, owner는 언제든 revoked
    if (status === 'active' && !isDelegate) {
      return NextResponse.json({ success: false, message: '수락은 대리인만' }, { status: 403 });
    }
    await executeQuery(
      `UPDATE mijung_delegations SET status = ? WHERE id = ?`,
      [status, rowId]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('delegations PATCH 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// DELETE /api/delegations/:id — 관계 삭제
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  try {
    const { id } = await params;
    const rowId = Number(id);
    const rows = await executeQuery(
      `SELECT owner_user_id, delegate_user_id FROM mijung_delegations WHERE id = ? LIMIT 1`,
      [rowId]
    );
    if (rows.length === 0) return NextResponse.json({ success: false, message: '관계 없음' }, { status: 404 });
    const row = rows[0];
    if (Number(row.owner_user_id) !== userId && Number(row.delegate_user_id) !== userId) {
      return NextResponse.json({ success: false, message: '권한 없음' }, { status: 403 });
    }
    await executeQuery(`DELETE FROM mijung_delegations WHERE id = ?`, [rowId]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('delegations DELETE 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
