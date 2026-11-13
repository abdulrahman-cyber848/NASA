import { en } from './en';
import { ar } from './ar';

export type Lang = 'en' | 'ar';
export const DICTS: Record<Lang, Record<string, string>> = { en, ar };

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}