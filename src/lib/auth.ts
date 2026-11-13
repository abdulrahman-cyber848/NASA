// Server-side authentication for LunaNav.
// Passwords: scrypt (Node crypto) — never stored in plain text, never leave the server.
// Sessions: 32-byte random tokens; only their SHA-256 hash is stored in Postgres.
// Row ownership: every user-owned query is scoped to the session user's id
// (server-enforced equivalent of per-user RLS on this local Postgres deployment).
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions, users, profiles } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = 'lunanav_session';
/** Pre-rename cookie name. Still accepted so existing sessions survive. */
const LEGACY_SESSION_COOKIE = 'lunascope_session';
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', expires: expiresAt,
  });
  if (jar.get(LEGACY_SESSION_COOKIE)) jar.delete(LEGACY_SESSION_COOKIE);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? jar.get(LEGACY_SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
  jar.delete(LEGACY_SESSION_COOKIE);
}

export interface SessionUser { id: string; email: string }

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? jar.get(LEGACY_SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProfile(userId: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function profileToJson(p: Awaited<ReturnType<typeof getProfile>>) {
  if (!p) return null;
  return {
    displayName: p.displayName, language: p.language, units: p.units, hemisphere: p.hemisphere,
    locationId: p.locationId, customLat: p.customLat, customLon: p.customLon, customTz: p.customTz,
  };
}

export const bad = (code: string, status = 400) => Response.json({ error: code }, { status });
export const unauthorized = () => bad('unauthorized', 401);