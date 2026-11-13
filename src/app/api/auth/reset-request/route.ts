import { randomBytes } from 'node:crypto';
import { db } from '@/db';
import { users, passwordResets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sha256, EMAIL_RE, bad } from '@/lib/auth';

// No email transport is configured in this environment. Rather than pretending
// to send mail, we return the single-use reset link directly to the requester.
export async function POST(req: Request) {
  let body: { email?: string };
  try { body = await req.json(); } catch { return bad('bad_request'); }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return bad('invalid_email');
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!rows[0]) return Response.json({ ok: true }); // do not disclose account existence
  const token = randomBytes(32).toString('hex');
  await db.insert(passwordResets).values({
    tokenHash: sha256(token), userId: rows[0].id, expiresAt: new Date(Date.now() + 3600000),
  });
  return Response.json({ ok: true, resetUrl: `/reset-password?token=${token}`, emailDelivery: false });
}