import { getSessionUser, getProfile, profileToJson } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ user: null, profile: null });
  return Response.json({ user, profile: profileToJson(await getProfile(user.id)) });
}