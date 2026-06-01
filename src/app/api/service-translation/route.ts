import { NextResponse } from 'next/server';
import axios from 'axios';
import { executeQuery } from '@/lib/database';

/**
 * 민원 번역 캐시 — GET /api/service-translation?service_id=N&lang=en
 * 캐시 hit이면 즉시 반환, miss면 챗봇 /translate_batch 호출 후 저장.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const serviceIdRaw = url.searchParams.get('service_id');
    const lang = url.searchParams.get('lang') ?? 'ko';

    if (!serviceIdRaw) return NextResponse.json({ success: false, message: 'service_id 필요' }, { status: 400 });
    const serviceId = Number(serviceIdRaw);
    if (!serviceId) return NextResponse.json({ success: false, message: '잘못된 service_id' }, { status: 400 });

    if (lang === 'ko') {
      // 한국어는 원문 그대로 — 번역 불필요
      const rows = await executeQuery(
        'SELECT service_name AS name, service_overview AS overview, eligibility FROM services WHERE id = ? LIMIT 1',
        [serviceId]
      );
      if (rows.length === 0) return NextResponse.json({ success: false, message: '서비스 없음' }, { status: 404 });
      return NextResponse.json({ success: true, lang, ...rows[0], cached: true });
    }

    // 캐시 hit 확인
    const cached = await executeQuery(
      'SELECT name, overview, eligibility FROM mijung_service_translations WHERE service_id = ? AND lang = ? LIMIT 1',
      [serviceId, lang]
    );
    if (cached.length > 0) {
      return NextResponse.json({ success: true, lang, ...cached[0], cached: true });
    }

    // 원문 가져오기
    const orig = await executeQuery(
      'SELECT service_name AS name, service_overview AS overview, eligibility FROM services WHERE id = ? LIMIT 1',
      [serviceId]
    );
    if (orig.length === 0) return NextResponse.json({ success: false, message: '서비스 없음' }, { status: 404 });
    const src = orig[0];

    // 챗봇 /translate_batch 호출
    const aiUrl = process.env.AI_API_URL;
    const inputs = [src.name ?? '', src.overview ?? '', src.eligibility ?? ''].map(s => s || '');
    let translated: string[] = inputs;
    try {
      const res = await axios.post(
        `${aiUrl}/translate_batch`,
        { texts: inputs, target_lang: lang, source_lang: 'ko' },
        { timeout: 60_000 }
      );
      const got = res.data?.translations ?? res.data?.results ?? res.data;
      if (Array.isArray(got) && got.length >= 3) translated = got;
    } catch (e: any) {
      console.error('AI /translate_batch error:', e.message);
      // 번역 실패 시 원문 그대로 사용 — 사용자에겐 한국어 그대로
      translated = inputs;
    }

    const [name, overview, eligibility] = translated;

    // 저장
    try {
      await executeQuery(
        `INSERT INTO mijung_service_translations (service_id, lang, name, overview, eligibility)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), overview = VALUES(overview), eligibility = VALUES(eligibility)`,
        [serviceId, lang, name, overview, eligibility]
      );
    } catch (e) {
      console.error('번역 캐시 저장 실패:', e);
    }

    return NextResponse.json({ success: true, lang, name, overview, eligibility, cached: false });
  } catch (error) {
    console.error('번역 API 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
