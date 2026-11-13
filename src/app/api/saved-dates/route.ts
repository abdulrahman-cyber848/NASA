import { db } from '@/db';
import { savedDates } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser, unauthorized, bad } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(savedDates)
    .where(eq(savedDates.userId, user.id)).orderBy(desc(savedDates.createdAt));
  return Response.json({ savedDates: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let b: { date?: string; note?: string };
  try { b = await req.json(); } catch { return bad('bad_request'); }
  const d = new Date(b.date ?? '');
  if (isNaN(d.getTime())) return bad('bad_date');
  const note = (b.note ?? '').slice(0, 500);
  const rows = await db.insert(savedDates).values({ userId: user.id, date: d.toISOString(), note }).returning();
  return Response.json({ savedDate: rows[0] });
}