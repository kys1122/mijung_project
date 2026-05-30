import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ service_id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "인증 필요" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const item_id = body?.item_id;
    const checked = body?.checked;

    if (typeof item_id !== 'string' || typeof checked !== 'boolean') {
      return NextResponse.json(
        { success: false, message: "잘못된 요청" },
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

    if (checked) {
      await executeQuery(
        'INSERT IGNORE INTO checklist_progress (user_id, service_id, item_id) VALUES (?, ?, ?)',
        [userIdStr, realServiceId, item_id]
      );
    } else {
      await executeQuery(
        'DELETE FROM checklist_progress WHERE user_id = ? AND service_id = ? AND item_id = ?',
        [userIdStr, realServiceId, item_id]
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('진행도 토글 오류:', error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
