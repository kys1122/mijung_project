import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getEffectiveUserId } from '@/lib/auth';

const ALLOWED_STEPS = ['description', 'required_docs', 'checklist', 'submitted'] as const;
type Step = (typeof ALLOWED_STEPS)[number];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ service_id: string }> }
) {
  try {
    const userId = await getEffectiveUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "인증 필요 또는 대리 권한 없음" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const step = body?.step;
    if (!ALLOWED_STEPS.includes(step)) {
      return NextResponse.json(
        { success: false, message: "잘못된 step 값" },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const serviceParam = decodeURIComponent(resolvedParams.service_id);

    const serviceRows = await executeQuery(
      'SELECT id FROM services WHERE id = ? OR service_name = ?',
      [serviceParam, serviceParam]
    );
    if (!serviceRows || serviceRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "서비스 없음" },
        { status: 404 }
      );
    }
    const realServiceId = serviceRows[0].id;
    const userIdStr = String(userId);

    await executeQuery(
      `INSERT INTO mijung_service_progress (user_id, service_id, last_step)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE last_step = VALUES(last_step)`,
      [userIdStr, realServiceId, step as Step]
    );

    return NextResponse.json({ success: true, last_step: step }, { status: 200 });
  } catch (error) {
    console.error('진행 단계 기록 오류:', error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
