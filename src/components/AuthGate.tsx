'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, useMounted } from '@/state/app';
import { PageSkeleton } from './ui';

import { KEYS } from '@/lib/brand';

export const GUEST_KEY = KEYS.guest;

/** Shows the login page before the main guide for first-time visitors.
 *  Signed-in users pass straight through; guests may explicitly continue
 *  from the login screen (their choice is remembered on this device). */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, authLoading } = useApp();
  const mounted = useMounted();
  const router = useRouter();
  const [guest] = useState(() => {
    try { return localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; }
  });
  const allowed = !!user || guest;

  useEffect(() => {
    if (mounted && !authLoading && !allowed) {
      const from = window.location.pathname + window.location.search;
      router.replace(`/login?from=${encodeURIComponent(from || '/')}`);
    }
  }, [mounted, authLoading, allowed, router]);

  if (!mounted || authLoading || !allowed) return <PageSkeleton />;
  return <>{children}</>;
}