import { db } from '@/db';
import { favoriteLandmarks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser, unauthorized, bad } from '@/lib/auth';
import { landmarkById } from '@/data/landmarks';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(favoriteLandmarks)
    .where(eq(favoriteLandmarks.userId, user.id)).orderBy(desc(favoriteLandmarks.createdAt));
  return Response.json({ favorites: rows.map(r => ({ id: r.id, landmarkId: r.landmarkId, createdAt: r.createdAt })) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let b: { landmarkId?: string };
  try { b = await req.json(); } catch { return bad('bad_request'); }
  if (!b.landmarkId || !landmarkById(b.landmarkId)) return bad('unknown_landmark');
  await db.insert(favoriteLandmarks).values({ userId: user.id, landmarkId: b.landmarkId }).onConflictDoNothing();
  return Response.json({ ok: true });
}