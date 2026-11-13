import { db } from '@/db';
import { observationJournal } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorized, bad } from '@/lib/auth';

const EQUIPMENT = ['eye', 'binoculars', 'telescope'];

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  let b: { date?: string; equipment?: string; location?: string; notes?: string };
  try { b = await req.json(); } catch { return bad('bad_request'); }
  const patch: Partial<typeof observationJournal.$inferInsert> = { updatedAt: new Date() };
  if (b.date) {
    const d = new Date(b.date);
    if (isNaN(d.getTime())) return bad('bad_date');
    patch.date = d.toISOString();
  }
  if (b.equipment && EQUIPMENT.includes(b.equipment)) patch.equipment = b.equipment;
  if (typeof b.location === 'string') patch.location = b.location.slice(0, 120);
  if (typeof b.notes === 'string') patch.notes = b.notes.slice(0, 4000);
  const rows = await db.update(observationJournal).set(patch)
    .where(and(eq(observationJournal.userId, user.id), eq(observationJournal.id, id))).returning();
  if (!rows[0]) return bad('not_found', 404);
  return Response.json({ entry: rows[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db.delete(observationJournal)
    .where(and(eq(observationJournal.userId, user.id), eq(observationJournal.id, id))).returning();
  if (!rows[0]) return bad('not_found', 404);
  return Response.json({ ok: true, entry: rows[0] });
}