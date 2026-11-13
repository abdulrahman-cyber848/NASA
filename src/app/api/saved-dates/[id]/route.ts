import { db } from '@/db';
import { savedDates } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorized } from '@/lib/auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.delete(savedDates).where(and(eq(savedDates.userId, user.id), eq(savedDates.id, id)));
  return Response.json({ ok: true });
}