import { db } from '@/db';
import { observationJournal } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser, unauthorized, bad } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const EQUIPMENT = ['eye', 'binoculars', 'telescope'];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(observationJournal)
    .where(eq(observationJournal.userId, user.id)).orderBy(desc(observationJournal.date));
  return Response.json({ entries: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let b: { date?: string; equipment?: string; location?: string; notes?: string };
  try { b = await req.json(); } catch { return bad('bad_request'); }
  const d = new Date(b.date ?? '');
  if (isNaN(d.getTime())) return bad('bad_date');
  const rows = await db.insert(observationJournal).values({
    userId: user.id,
    date: d.toISOString(),
    equipment: EQUIPMENT.includes(b.equipment ?? '') ? b.equipment! : 'eye',
    location: (b.location ?? '').slice(0, 120),
    notes: (b.notes ?? '').slice(0, 4000),
  }).returning();
  return Response.json({ entry: rows[0] });
}