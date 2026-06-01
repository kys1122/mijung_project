import { NextResponse } from 'next/server';
import axios from 'axios';
import { executeQuery } from '@/lib/database';

/**
 * 민원 번역 배치 — POST /api/service-translation/batch { service_ids: number[], lang: string }
 * 캐시 hit은 즉시, miss는 한 번의 /translate_batch 호출로 처리.
 * 반환: { translations: Record<service_id, { name, overview, eligibility }> }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lang = String(body?.lang ?? 'ko');
    const idsRaw: any[] = Array.isArray(body?.service_ids) ? body.service_ids : [];
    const ids = Array.from(new Set(idsRaw.map(n => Number(n)).filter(n => n > 0)));
    if (ids.length === 0) return NextResponse.json({ success: true, translations: {} });

    if (lang === 'ko') {
      const rows = await executeQuery(
        `SELECT id, service_name AS name, service_overview AS overview, eligibility
           FROM services WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      const translations: Record<number, any> = {};
      for (const r of rows) translations[Number(r.id)] = { name: r.name, overview: r.overview, eligibility: r.eligibility };
      return NextResponse.json({ success: true, lang, translations });
    }

    // 캐시 hit 분
    const cachedRows = await executeQuery(
      `SELECT service_id, name, overview, eligibility
         FROM mijung_service_translations
        WHERE lang = ? AND service_id IN (${ids.map(() => '?').join(',')})`,
      [lang, ...ids]
    );
    const cachedMap = new Map<number, any>();
    for (const r of cachedRows) cachedMap.set(Number(r.service_id), { name: r.name, overview: r.overview, eligibility: r.eligibility });

    const missingIds = ids.filter(id => !cachedMap.has(id));

    let freshMap = new Map<number, any>();
    if (missingIds.length > 0) {
      const origRows = await executeQuery(
        `SELECT id, service_name AS name, service_overview AS overview, eligibility
           FROM services WHERE id IN (${missingIds.map(() => '?').join(',')})`,
        missingIds
      );
      // 한 줄로 batch 보내려면 모든 텍스트를 평탄화. 형식: 3 텍스트 x N서비스
      const texts: string[] = [];
      const slots: { id: number }[] = [];
      for (const r of origRows) {
        texts.push(r.name ?? '');
        texts.push(r.overview ?? '');
        texts.push(r.eligibility ?? '');
        slots.push({ id: Number(r.id) });
      }
      let translated = texts;
      if (texts.length > 0) {
        try {
          const res = await axios.post(
            `${process.env.AI_API_URL}/translate_batch`,
            { texts, target_lang: lang, source_lang: 'ko' },
            { timeout: 60_000 }
          );
          const got = res.data?.translations ?? res.data?.results ?? res.data;
          if (Array.isArray(got) && got.length === texts.length) translated = got;
        } catch (e: any) {
          console.error('AI /translate_batch error:', e.message);
          // 폴백: 원문 그대로
        }
      }
      // slot마다 3개씩 가져옴
      for (let i = 0; i < slots.length; i++) {
        const tr = {
          name: translated[i * 3] ?? '',
          overview: translated[i * 3 + 1] ?? '',
          eligibility: translated[i * 3 + 2] ?? '',
        };
        freshMap.set(slots[i].id, tr);
        // DB upsert (실패해도 응답엔 영향 없음)
        try {
          await executeQuery(
            `INSERT INTO mijung_service_translations (service_id, lang, name, overview, eligibility)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), overview = VALUES(overview), eligibility = VALUES(eligibility)`,
            [slots[i].id, lang, tr.name, tr.overview, tr.eligibility]
          );
        } catch (e) { console.error('번역 캐시 저장 실패:', e); }
      }
    }

    const translations: Record<number, any> = {};
    for (const id of ids) {
      const v = cachedMap.get(id) ?? freshMap.get(id);
      if (v) translations[id] = v;
    }

    return NextResponse.json({ success: true, lang, translations });
  } catch (error) {
    console.error('번역 배치 API 오류:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
