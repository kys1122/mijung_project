import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "인증 필요" },
        { status: 401 }
      );
    }

    const userIdStr = String(userId);

    const rows = await executeQuery(
      `SELECT
         s.id,
         s.service_name AS name,
         s.official_name,
         s.ministry,
         s.department,
         s.fee,
         s.eligibility,
         msp.last_step,
         msp.started_at,
         msp.updated_at,
         (SELECT COUNT(*) FROM checklist_progress cp
          WHERE cp.user_id = ? AND cp.service_id = s.id) AS completed_count
       FROM mijung_service_progress msp
       JOIN services s ON s.id = msp.service_id
       WHERE msp.user_id = ?
       ORDER BY msp.updated_at DESC`,
      [userIdStr, userIdStr]
    );

    const services = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      official_name: r.official_name,
      ministry: r.ministry,
      department: r.department,
      fee: r.fee,
      eligibility: r.eligibility,
      last_step: r.last_step,
      completed_count: Number(r.completed_count),
      started_at: r.started_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ success: true, services }, { status: 200 });
  } catch (error) {
    console.error('내 민원 목록 조회 오류:', error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
