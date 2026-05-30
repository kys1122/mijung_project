import jwt from 'jsonwebtoken';

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
