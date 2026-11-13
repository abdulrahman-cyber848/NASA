import { db } from '@/db';
import { users, profiles } from '@/db/schema';
import { hashPassword, createSession, getProfile, profileToJson, EMAIL_RE, bad } from '@/lib/auth';

export async function POST(req: Request) {
  let body: { email?: string; password?: string; displayName?: string };
  try { body = await req.json(); } catch { return bad('bad_request'); }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const displayName = (body.displayName ?? '').trim().slice(0, 60);
  if (!EMAIL_RE.test(email)) return bad('invalid_email');
  if (password.length < 8) return bad('pw_short');
  try {
    const passwordHash = await hashPassword(password);
    const inserted = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id, email: users.email });
    const user = inserted[0];
    await db.insert(profiles).values({ userId: user.id, displayName: displayName || email.split('@')[0] });
    await createSession(user.id);
    return Response.json({ user, profile: profileToJson(await getProfile(user.id)) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('unique') || msg.includes('duplicate')) return bad('email_taken', 409);
    console.error('signup error', e);
    return bad('server_error', 500);
  }
}