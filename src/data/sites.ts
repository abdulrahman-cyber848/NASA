// Combined lunar site collection.
// The original curated LANDMARKS list is preserved EXACTLY as-is (never removed,
// replaced or modified). NASA Daily Moon Guide sites are appended on top, with
// duplicate detection by id AND by angular proximity so no location is doubled.
import { LANDMARKS, type Landmark } from './landmarks';
import { GAZETTEER_FEATURE_IDS } from './references';
import { NASA_DAILY_MOON_SITES, type MoonSite, type SiteType } from './nasaSites';

export type { MoonSite, SiteType };

/** Original 11/12 curated landmarks, untouched, promoted with their verified IAU ids. */
export const ORIGINAL_SITES: MoonSite[] = LANDMARKS.map((l: Landmark) => ({
  ...l,
  confidence: 'iau' as const,
  iauId: GAZETTEER_FEATURE_IDS[l.id],
}));

const DEG = Math.PI / 180;
const angularSep = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const p1 = aLat * DEG, l1 = aLon * DEG, p2 = bLat * DEG, l2 = bLon * DEG;
  return Math.acos(Math.max(-1, Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l2 - l1)))) / DEG;
};

const seen = new Set(ORIGINAL_SITES.map(s => s.id));
const added: MoonSite[] = [];
const skippedDuplicates: string[] = [];
for (const site of NASA_DAILY_MOON_SITES) {
  const clash = ORIGINAL_SITES.some(o => o.id === site.id || angularSep(o.lat, o.lon, site.lat, site.lon) < 1.2);
  if (clash) { skippedDuplicates.push(site.id); continue; }
  if (seen.has(site.id)) continue;
  seen.add(site.id);
  added.push(site);
}

/** Original locations + every additional NASA Daily Moon Guide location. */
export const ALL_SITES: MoonSite[] = [...ORIGINAL_SITES, ...added];
export const NASA_ADDED_SITES = added;
export const DUPLICATE_SKIPS = skippedDuplicates;

/** Attributes shown by the count badges. */
export const SITE_STATS = {
  original: ORIGINAL_SITES.length,
  nasaAdded: added.length,
  total: ALL_SITES.length,
};

export const siteById = (id: string): MoonSite | undefined => ALL_SITES.find(s => s.id === id);

export const EQUIPMENT_RANK = { eye: 0, binoculars: 1, telescope: 2 } as const;
export type Equipment = keyof typeof EQUIPMENT_RANK;

export const SITE_TYPE_ORDER: SiteType[] = [
  'crater', 'mare', 'mountain', 'highlands', 'basin', 'valley', 'rille', 'scarp', 'dome', 'landing',
];