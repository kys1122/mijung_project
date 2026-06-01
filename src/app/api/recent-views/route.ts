import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

// GET /api/recent-views?limit=10 — 최근 본 민원 목록
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 10), 1), 50);

  try {
    const rows = await executeQuery(
      `SELECT
         s.id, s.service_name AS name, s.official_name,
         s.ministry, s.department,
         r.viewed_at
       FROM mijung_recent_views r
       JOIN services s ON s.id = r.service_id
       WHERE r.user_id = ?
       ORDER BY r.viewed_at DESC
       LIMIT ${limit}`,
      [userId]
    );
    return NextResponse.json({ success: true, recents: rows });
  } catch (e) {
    console.error('recent-views GET 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// POST /api/recent-views { service_id } — 본 시점 기록 (upsert)
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  try {
    const body = await request.json();
    const serviceId = Number(body?.service_id);
    if (!serviceId) return NextResponse.json({ success: false, message: 'service_id 필요' }, { status: 400 });

    await executeQuery(
      `INSERT INTO mijung_recent_views (user_id, service_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP`,
      [userId, serviceId]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('recent-views POST 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
