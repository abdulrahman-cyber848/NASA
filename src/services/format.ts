import type { Lang } from '@/i18n';

export type Units = 'km' | 'mi';
export const KM_TO_MI = 0.621371;

export function fmtNum(n: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: digits, minimumFractionDigits: digits,
  }).format(n);
}

export function distanceValue(km: number, units: Units): number {
  return units === 'mi' ? km * KM_TO_MI : km;
}

export function fmtDistance(km: number, units: Units, lang: Lang): string {
  const v = distanceValue(km, units);
  return `${fmtNum(v, lang)} ${units === 'mi' ? (lang === 'ar' ? 'ميل' : 'mi') : (lang === 'ar' ? 'كم' : 'km')}`;
}

export function fmtCoord(lat: number, lon: number, lang: Lang): string {
  const d = (v: number) => fmtNum(Math.abs(v), lang, 1);
  const ns = lang === 'ar' ? (lat >= 0 ? 'ش' : 'ج') : (lat >= 0 ? 'N' : 'S');
  const ew = lang === 'ar' ? (lon >= 0 ? 'ق' : 'غ') : (lon >= 0 ? 'E' : 'W');
  return `${d(lat)}°${ns}, ${d(lon)}°${ew}`;
}

export function fmtPct(fraction: number, lang: Lang, digits = 0): string {
  return `${fmtNum(fraction * 100, lang, digits)}%`;
}

export function fmtArcsec(v: number, lang: Lang): string {
  return `${fmtNum(v, lang)}″`;
}