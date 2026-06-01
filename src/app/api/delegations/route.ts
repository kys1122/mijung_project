import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

// GET /api/delegations — 내가 owner거나 delegate인 모든 관계
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  try {
    const asOwner = await executeQuery(
      `SELECT d.id, d.delegate_user_id AS user_id, u.name, u.email,
              d.relation, d.status, d.created_at, d.updated_at
         FROM mijung_delegations d
         JOIN users u ON u.id = d.delegate_user_id
        WHERE d.owner_user_id = ?
        ORDER BY d.updated_at DESC`,
      [userId]
    );
    const asDelegate = await executeQuery(
      `SELECT d.id, d.owner_user_id AS user_id, u.name, u.email,
              d.relation, d.status, d.created_at, d.updated_at
         FROM mijung_delegations d
         JOIN users u ON u.id = d.owner_user_id
        WHERE d.delegate_user_id = ?
        ORDER BY d.updated_at DESC`,
      [userId]
    );
    return NextResponse.json({ success: true, as_owner: asOwner, as_delegate: asDelegate });
  } catch (e) {
    console.error('delegations GET 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// POST /api/delegations { email, relation? } — 이메일로 대리인 초대 (status='pending')
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const relation = body?.relation ? String(body.relation).slice(0, 50) : null;
    if (!email) return NextResponse.json({ success: false, message: '이메일 필요' }, { status: 400 });

    const targets = await executeQuery(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (targets.length === 0) {
      return NextResponse.json(
        { success: false, message: '해당 이메일의 회원을 찾을 수 없어요' },
        { status: 404 }
      );
    }
    const delegateId = Number(targets[0].id);
    if (delegateId === userId) {
      return NextResponse.json({ success: false, message: '자기 자신은 초대할 수 없어요' }, { status: 400 });
    }

    await executeQuery(
      `INSERT INTO mijung_delegations (owner_user_id, delegate_user_id, relation, status)
       VALUES (?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE relation = VALUES(relation), status = 'pending'`,
      [userId, delegateId, relation]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('delegations POST 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
