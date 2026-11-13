import { db } from '@/db';
import { users, passwordResets, sessions } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { sha256, hashPassword, bad } from '@/lib/auth';

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try { body = await req.json(); } catch { return bad('bad_request'); }
  const token = body.token ?? '';
  const password = body.password ?? '';
  if (password.length < 8) return bad('pw_short');
  if (!/^[a-f0-9]{64}$/.test(token)) return bad('reset_invalid', 400);
  const rows = await db.select().from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, sha256(token)), gt(passwordResets.expiresAt, new Date()), isNull(passwordResets.usedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return bad('reset_invalid', 400);
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, row.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.tokenHash, row.tokenHash));
  await db.delete(sessions).where(eq(sessions.userId, row.userId)); // invalidate old sessions
  return Response.json({ ok: true });
}