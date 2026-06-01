import crypto from "crypto";
import axios from "axios";
import { executeQuery } from "@/lib/database";

function sha1(s: string): string {
  return crypto.createHash("sha1").update(s, "utf8").digest("hex");
}

/**
 * 여러 텍스트를 한 lang으로 한 번에 번역.
 * 이미 캐시된 텍스트는 즉시 반환, 누락분만 chatbot /translate_batch 호출 후 저장.
 * 빈 텍스트나 lang === 'ko'면 원문 그대로 반환.
 */
export async function cachedTranslateBatch(texts: string[], lang: string, sourceLang = 'ko'): Promise<string[]> {
  if (!texts || texts.length === 0) return [];
  if (lang === sourceLang) return texts;

  const result: string[] = new Array(texts.length).fill('');
  const indexByHash = new Map<string, number[]>(); // hash → 이 텍스트가 등장한 결과 위치들
  const hashes: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    const src = texts[i] ?? '';
    if (!src) { result[i] = ''; continue; }
    const h = sha1(`${src}::${lang}`);
    if (!indexByHash.has(h)) {
      indexByHash.set(h, []);
      hashes.push(h);
    }
    indexByHash.get(h)!.push(i);
  }
  if (hashes.length === 0) return result;

  // 캐시 hit 조회
  const placeholders = hashes.map(() => '?').join(',');
  const rows = await executeQuery(
    `SELECT source_hash, translated_text FROM mijung_text_translations
      WHERE lang = ? AND source_hash IN (${placeholders})`,
    [lang, ...hashes]
  );
  const cacheMap = new Map<string, string>();
  for (const r of rows) cacheMap.set(String(r.source_hash), String(r.translated_text ?? ''));

  // 미캐시 hash 목록 + 원문 모음
  const missingHashes: string[] = [];
  const missingTexts: string[] = [];
  for (const h of hashes) {
    if (cacheMap.has(h)) continue;
    const idxs = indexByHash.get(h)!;
    const src = texts[idxs[0]] ?? '';
    missingHashes.push(h);
    missingTexts.push(src);
  }

  // 미캐시 분 LLM 호출
  let translated: string[] = missingTexts.slice();
  if (missingTexts.length > 0) {
    // 백엔드 /translate_batch는 texts를 object(key→text)로 받음
    const textsObj: Record<string, string> = {};
    for (let i = 0; i < missingTexts.length; i++) textsObj[String(i)] = missingTexts[i];
    try {
      const res = await axios.post(
        `${process.env.AI_API_URL}/translate_batch`,
        { texts: textsObj, target_lang: lang },
        {
          timeout: 60_000,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          responseType: 'json',
        }
      );
      const data = res.data;
      // 백엔드 응답: {translated: {"0": "Hello", "1": "..."}}
      const got = data?.translated ?? data?.translations ?? data?.results ?? data;
      if (got && typeof got === 'object' && !Array.isArray(got)) {
        for (let i = 0; i < missingTexts.length; i++) {
          const v = got[String(i)] ?? got[i];
          if (typeof v === 'string' && v) translated[i] = v;
        }
      } else if (Array.isArray(got) && got.length === missingTexts.length) {
        translated = got.map(String);
      }
    } catch (e: any) {
      console.error('translate_batch error:', e.message, e.response?.data);
    }
  }

  // 저장 + cacheMap 갱신 — 번역 실패해서 원문과 같으면 캐시하지 않음 (다음 호출 시 재시도)
  for (let i = 0; i < missingHashes.length; i++) {
    const h = missingHashes[i];
    const src = missingTexts[i];
    const tr = translated[i] ?? src;
    cacheMap.set(h, tr);
    if (tr === src) continue; // 번역 실패 — 저장 스킵
    try {
      await executeQuery(
        `INSERT INTO mijung_text_translations (source_hash, lang, source_text, translated_text)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text)`,
        [h, lang, src, tr]
      );
    } catch (e) { console.error('translation cache insert failed:', e); }
  }

  // 결과 위치별 채우기
  for (const h of hashes) {
    const tr = cacheMap.get(h) ?? '';
    for (const idx of indexByHash.get(h)!) result[idx] = tr || (texts[idx] ?? '');
  }
  return result;
}
