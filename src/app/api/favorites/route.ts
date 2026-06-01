import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

// GET /api/favorites — 내 즐겨찾기 목록 (서비스 메타 포함)
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  try {
    const rows = await executeQuery(
      `SELECT
         s.id, s.service_name AS name, s.official_name,
         s.ministry, s.department, s.fee, s.eligibility,
         f.created_at AS favorited_at
       FROM mijung_favorites f
       JOIN services s ON s.id = f.service_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return NextResponse.json({ success: true, favorites: rows });
  } catch (e) {
    console.error('favorites GET 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// POST /api/favorites { service_id } — 토글 (있으면 삭제, 없으면 추가)
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ success: false, message: '인증 필요' }, { status: 401 });

  try {
    const body = await request.json();
    const serviceId = Number(body?.service_id);
    if (!serviceId) return NextResponse.json({ success: false, message: 'service_id 필요' }, { status: 400 });

    const existing = await executeQuery(
      `SELECT id FROM mijung_favorites WHERE user_id = ? AND service_id = ? LIMIT 1`,
      [userId, serviceId]
    );

    if (existing.length > 0) {
      await executeQuery(
        `DELETE FROM mijung_favorites WHERE user_id = ? AND service_id = ?`,
        [userId, serviceId]
      );
      return NextResponse.json({ success: true, favorited: false });
    }

    await executeQuery(
      `INSERT INTO mijung_favorites (user_id, service_id) VALUES (?, ?)`,
      [userId, serviceId]
    );
    return NextResponse.json({ success: true, favorited: true });
  } catch (e) {
    console.error('favorites POST 오류:', e);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
