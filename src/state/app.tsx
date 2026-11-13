'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { translate, type Lang } from '@/i18n';
import { cityById } from '@/data/cities';
import type { Equipment } from '@/data/landmarks';
import type { Units } from '@/services/format';
import { KEYS, migrateLegacyStorage } from '@/lib/brand';

export interface Prefs {
  lang: Lang;
  units: Units;
  hemisphere: 'north' | 'south';
  equipment: Equipment;
  locationId: string; // city id or 'custom'
  customLat: number;
  customLon: number;
  customTz: string;
}

const DEFAULT_PREFS: Prefs = {
  lang: 'en', units: 'km', hemisphere: 'north', equipment: 'binoculars',
  locationId: 'cairo', customLat: 30.0444, customLon: 31.2357, customTz: 'UTC',
};
const LS_KEY = KEYS.prefs;

export interface AuthUser { id: string; email: string }
export interface ServerProfile {
  displayName: string; language: string; units: string; hemisphere: string;
  locationId: string; customLat: number | null; customLon: number | null; customTz: string | null;
}
export interface ResolvedLocation { lat: number; lon: number; tz: string; label: string; id: string }
export interface Toast { id: number; kind: 'ok' | 'err' | 'info'; msg: string; actionLabel?: string; onAction?: () => void }

interface AppState {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  lang: Lang;
  dir: 'ltr' | 'rtl';
  t: (key: string, vars?: Record<string, string | number>) => string;
  date: Date;
  setDate: (d: Date) => void;
  location: ResolvedLocation;
  user: AuthUser | null;
  profile: ServerProfile | null;
  authLoading: boolean;
  refreshAuth: () => Promise<void>;
  applyServerProfile: (u: AuthUser | null, p: ServerProfile | null) => void;
  logout: () => Promise<void>;
  favorites: Set<string>;
  toggleFavorite: (landmarkId: string) => Promise<void>;
  toasts: Toast[];
  pushToast: (kind: Toast['kind'], msg: string, actionLabel?: string, onAction?: () => void) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppState | null>(null);
let toastSeq = 1;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [date, setDate] = useState<Date>(() => new Date(Math.floor(Date.now() / 60000) * 60000));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ServerProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const hydrated = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  const lang = prefs.lang;
  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  // hydrate prefs from localStorage
  useEffect(() => {
    try {
      migrateLegacyStorage();
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setPrefsState(p => ({ ...p, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    if (hydrated.current) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    }
  }, [prefs]);

  const applyServerProfile = useCallback((u: AuthUser | null, p: ServerProfile | null) => {
    setUser(u); setProfile(p);
    if (p) {
      setPrefsState(prev => ({
        ...prev,
        lang: p.language === 'ar' ? 'ar' : 'en',
        units: p.units === 'mi' ? 'mi' : 'km',
        hemisphere: p.hemisphere === 'south' ? 'south' : 'north',
        locationId: p.locationId || prev.locationId,
        customLat: p.customLat ?? prev.customLat,
        customLon: p.customLon ?? prev.customLon,
        customTz: p.customTz ?? prev.customTz,
      }));
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      applyServerProfile(data.user ?? null, data.profile ?? null);
      if (data.user) {
        const f = await fetch('/api/favorites');
        if (f.ok) {
          const fd = await f.json();
          setFavorites(new Set((fd.favorites ?? []).map((x: { landmarkId: string }) => x.landmarkId)));
        }
      } else setFavorites(new Set());
    } catch { /* offline */ }
    finally { setAuthLoading(false); }
  }, [applyServerProfile]);

  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...p };
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        if (!userRef.current) return; // signed out: local persistence only, no 401 noise
        fetch('/api/profile', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: next.lang, units: next.units, hemisphere: next.hemisphere,
            locationId: next.locationId, customLat: next.customLat, customLon: next.customLon, customTz: next.customTz,
          }),
        }).catch(() => { /* signed out or offline — local prefs still persist */ });
      }, 700);
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    try { localStorage.removeItem(KEYS.guest); } catch { /* ignore */ }
    setUser(null); setProfile(null); setFavorites(new Set());
  }, []);

  const dismissToast = useCallback((id: number) => setToasts(ts => ts.filter(x => x.id !== id)), []);
  const pushToast = useCallback((kind: Toast['kind'], msg: string, actionLabel?: string, onAction?: () => void) => {
    const id = toastSeq++;
    setToasts(ts => [...ts.slice(-3), { id, kind, msg, actionLabel, onAction }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), onAction ? 8000 : 4500);
  }, []);

  const toggleFavorite = useCallback(async (landmarkId: string) => {
    if (!user) {
      pushToast('info', translate(lang, 'toast.loginToFav'), translate(lang, 'nav.login'), () => {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
      });
      return;
    }
    const had = favorites.has(landmarkId);
    setFavorites(prev => {
      const n = new Set(prev);
      if (had) n.delete(landmarkId); else n.add(landmarkId);
      return n;
    });
    try {
      const res = had
        ? await fetch(`/api/favorites/${encodeURIComponent(landmarkId)}`, { method: 'DELETE' })
        : await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ landmarkId }) });
      if (!res.ok) throw new Error();
      pushToast('ok', translate(lang, had ? 'toast.favRemoved' : 'toast.favAdded'));
    } catch {
      setFavorites(prev => {
        const n = new Set(prev);
        if (had) n.add(landmarkId); else n.delete(landmarkId);
        return n;
      });
      pushToast('err', translate(lang, 'common.error'));
    }
  }, [user, favorites, lang, pushToast]);

  const location: ResolvedLocation = useMemo(() => {
    if (prefs.locationId === 'custom') {
      return {
        lat: prefs.customLat, lon: prefs.customLon, tz: prefs.customTz || 'UTC',
        label: lang === 'ar' ? 'إحداثيات مخصصة' : 'Custom location', id: 'custom',
      };
    }
    const c = cityById(prefs.locationId);
    return { lat: c.lat, lon: c.lon, tz: c.tz, label: lang === 'ar' ? c.nameAr : c.name, id: c.id };
  }, [prefs.locationId, prefs.customLat, prefs.customLon, prefs.customTz, lang]);

  const value: AppState = {
    prefs, setPrefs, lang, dir, t, date, setDate, location,
    user, profile, authLoading, refreshAuth, applyServerProfile, logout,
    favorites, toggleFavorite, toasts, pushToast, dismissToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}

/** True only after client mount — date-dependent pages render a skeleton on the
 *  server so prerendered text can never mismatch the live computation. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}