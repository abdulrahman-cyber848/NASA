import { db } from '@/db';
import { favoriteLandmarks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorized } from '@/lib/auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ landmarkId: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { landmarkId } = await params;
  await db.delete(favoriteLandmarks)
    .where(and(eq(favoriteLandmarks.userId, user.id), eq(favoriteLandmarks.landmarkId, landmarkId)));
  return Response.json({ ok: true });
}