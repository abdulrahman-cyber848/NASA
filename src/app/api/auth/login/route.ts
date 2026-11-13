import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession, getProfile, profileToJson, EMAIL_RE, bad } from '@/lib/auth';

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return bad('bad_request'); }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!EMAIL_RE.test(email) || !password) return bad('bad_creds', 401);
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) return bad('bad_creds', 401);
  await createSession(user.id);
  return Response.json({ user: { id: user.id, email: user.email }, profile: profileToJson(await getProfile(user.id)) });
}