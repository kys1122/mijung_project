import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// 전체 민원 서비스 목록 (인증 불필요 — 둘러보기용)
export async function GET() {
  try {
    const rows = await executeQuery(
      `SELECT id, service_name, official_name, ministry, department, fee
         FROM services
        ORDER BY service_name ASC`
    );
    return NextResponse.json({
      success: true,
      services: rows.map((r: any) => ({
        id: r.id,
        name: r.service_name,
        official_name: r.official_name,
        ministry: r.ministry,
        department: r.department,
        fee: r.fee,
      })),
    });
  } catch (error) {
    console.error('민원 목록 조회 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
