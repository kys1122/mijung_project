import jwt from 'jsonwebtoken';
import { executeQuery } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_access_key";

export function getUserIdFromRequest(request: Request): number | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: number };
    return payload.userId;
  } catch {
    return null;
  }
}

/**
 * 대리 모드 해석.
 * URL의 on_behalf_of (또는 X-On-Behalf-Of 헤더)에 owner_id가 있고,
 * 요청자가 그 owner의 active delegate면 effective user는 owner.
 * 그렇지 않으면 effective user는 요청자 본인.
 *
 * 반환 null = 인증 안 됨 또는 권한 없음.
 */
export async function getEffectiveUserId(request: Request): Promise<number | null> {
  const me = getUserIdFromRequest(request);
  if (!me) return null;

  const url = new URL(request.url);
  const onBehalfOfRaw = url.searchParams.get('on_behalf_of') ?? request.headers.get('x-on-behalf-of');
  if (!onBehalfOfRaw) return me;

  const ownerId = Number(onBehalfOfRaw);
  if (!ownerId || ownerId === me) return me;

  const rel = await executeQuery(
    `SELECT id FROM mijung_delegations
      WHERE owner_user_id = ? AND delegate_user_id = ? AND status = 'active'
      LIMIT 1`,
    [ownerId, me]
  );
  if (rel.length === 0) {
    // 권한 없음 — 본인으로 폴백하지 말고 null
    return null;
  }
  return ownerId;
}
