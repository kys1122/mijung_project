import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getEffectiveUserId } from '@/lib/auth';

export async function PUT(
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

    // 자동 완료 트리거 — body.required_track_ids 다 체크됐으면 mijung_service_progress.last_step = 'submitted'
    // 트랙 단위: [["step_1","step_2"], ["step_1","step_3"]] 처럼 OR 트랙 배열. 한 트랙이라도 다 차면 완료.
    const tracks: string[][] | undefined = Array.isArray(body?.tracks) ? body.tracks : undefined;
    let autoSubmitted = false;
    if (tracks && tracks.length > 0) {
      const doneRows = await executeQuery(
        'SELECT item_id FROM checklist_progress WHERE user_id = ? AND service_id = ?',
        [userIdStr, realServiceId]
      );
      const doneSet = new Set(doneRows.map((r: any) => r.item_id));
      const anyTrackComplete = tracks.some(
        t => t.length > 0 && t.every(id => doneSet.has(id))
      );
      if (anyTrackComplete) {
        await executeQuery(
          `INSERT INTO mijung_service_progress (user_id, service_id, last_step)
           VALUES (?, ?, 'submitted')
           ON DUPLICATE KEY UPDATE last_step = 'submitted', updated_at = CURRENT_TIMESTAMP`,
          [userIdStr, realServiceId]
        );
        autoSubmitted = true;
      }
    }

    return NextResponse.json({ success: true, auto_submitted: autoSubmitted }, { status: 200 });
  } catch (error) {
    console.error('진행도 토글 오류:', error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
