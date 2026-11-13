import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser, getProfile, profileToJson, unauthorized, bad } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return Response.json({ profile: profileToJson(await getProfile(user.id)) });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return bad('bad_request'); }
  const patch: Partial<typeof profiles.$inferInsert> = { userId: user.id, updatedAt: new Date() };
  if (typeof b.displayName === 'string') patch.displayName = b.displayName.trim().slice(0, 60);
  if (b.language === 'en' || b.language === 'ar') patch.language = b.language;
  if (b.units === 'km' || b.units === 'mi') patch.units = b.units;
  if (b.hemisphere === 'north' || b.hemisphere === 'south') patch.hemisphere = b.hemisphere;
  if (typeof b.locationId === 'string' && b.locationId.length <= 40) patch.locationId = b.locationId;
  if (typeof b.customLat === 'number' && Math.abs(b.customLat) <= 90) patch.customLat = b.customLat;
  if (typeof b.customLon === 'number' && Math.abs(b.customLon) <= 180) patch.customLon = b.customLon;
  if (typeof b.customTz === 'string' && b.customTz.length <= 60) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: b.customTz }); patch.customTz = b.customTz; } catch { return bad('bad_timezone'); }
  }
  await db.insert(profiles).values(patch as typeof profiles.$inferInsert)
    .onConflictDoUpdate({ target: profiles.userId, set: patch });
  return Response.json({ profile: profileToJson(await getProfile(user.id)) });
}