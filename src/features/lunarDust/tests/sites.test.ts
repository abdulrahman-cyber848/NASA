import { describe, it, expect } from 'vitest';
import { ALL_SITES, ORIGINAL_SITES, NASA_ADDED_SITES, SITE_STATS, siteById } from '@/data/sites';
import { LANDMARKS } from '@/data/landmarks';
import { NASA_DAILY_MOON_SITES } from '@/data/nasaSites';

const DEG = Math.PI / 180;
const sep = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const p1 = aLat * DEG, l1 = aLon * DEG, p2 = bLat * DEG, l2 = bLon * DEG;
  return Math.acos(Math.max(-1, Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l2 - l1)))) / DEG;
};

describe('lunar site atlas integrity', () => {
  it('the original curated landmarks are preserved byte-for-byte in the merged set', () => {
    expect(ORIGINAL_SITES.length).toBe(LANDMARKS.length);
    ORIGINAL_SITES.forEach((s, i) => {
      const o = LANDMARKS[i];
      expect(s.id).toBe(o.id);
      expect(s.lat).toBe(o.lat);
      expect(s.lon).toBe(o.lon);
      expect(s.name).toBe(o.name);
      expect(s.diameterKm).toBe(o.diameterKm);
      expect(s.description).toBe(o.description);
    });
    // every original id must still resolve in the merged atlas
    for (const o of LANDMARKS) expect(siteById(o.id)?.id).toBe(o.id);
  });

  it('contains no duplicates by id or by angular proximity', () => {
    const ids = new Set<string>();
    for (const s of ALL_SITES) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
    // NASA lists a few entries that are genuinely co-located on the ground
    // (Apollo 14 landed inside the Fra Mauro Highlands). Those may sit within a
    // fraction of a degree; anything else must be a distinct feature.
    const coincident: string[] = [];
    for (let i = 0; i < ALL_SITES.length; i++)
      for (let j = i + 1; j < ALL_SITES.length; j++) {
        const d = sep(ALL_SITES[i].lat, ALL_SITES[i].lon, ALL_SITES[j].lat, ALL_SITES[j].lon);
        if (d <= 0.03) coincident.push(`${ALL_SITES[i].name} / ${ALL_SITES[j].name}`);
        else expect(d).toBeGreaterThan(0.03);
      }
    // only true landing-site/region pairs may coincide, and both keep exact coords
    expect(coincident.every(c => /Apollo \d+ /.test(c))).toBe(true);
  });

  it('adds the NASA Daily Moon Guide sites on top of the originals', () => {
    expect(SITE_STATS.total).toBe(SITE_STATS.original + SITE_STATS.nasaAdded);
    expect(SITE_STATS.total).toBe(ALL_SITES.length);
    expect(NASA_ADDED_SITES.length).toBeGreaterThan(20);
    // every NASA site is either merged or was a genuine duplicate of an original
    for (const s of NASA_DAILY_MOON_SITES) {
      const merged = siteById(s.id);
      if (!merged) {
        // must be a near-duplicate of an original landmark
        expect(ORIGINAL_SITES.some(o => sep(o.lat, o.lon, s.lat, s.lon) < 1.2)).toBe(true);
      } else {
        expect(merged.lat).toBe(s.lat);
        expect(merged.lon).toBe(s.lon);
      }
    }
  });

  it('covers the NASA site categories named in the guide', () => {
    const types = new Set(ALL_SITES.map(s => s.type));
    for (const t of ['crater', 'mare', 'mountain', 'basin', 'valley', 'highlands', 'landing'] as const)
      expect(types.has(t)).toBe(true);
    // NASA's named locations must all be represented somewhere in the atlas
    const mustHave = [
      'Gassendi', 'Grimaldi', 'Humorum', 'Alphonsus', 'Archimedes', 'Endymion',
      'Posidonius', 'Linne', 'Messier', 'Moretus', 'Schiller', 'Cyrillus',
      'Apennine', 'Caucasus', 'Alps', 'Haemus', 'Rümker', 'Gruithuisen',
      'Frigoris', 'Fecunditatis', 'Nectaris', 'Schröter', 'Alpine Valley',
      'Straight Wall', 'Altai', 'Fra Mauro', 'Descartes', 'Taurus',
      'Apollo 11', 'Apollo 12', 'Apollo 14', 'Apollo 15', 'Apollo 16', 'Apollo 17',
    ];
    const names = ALL_SITES.map(s => `${s.name} ${s.nameAr}`);
    for (const m of mustHave) expect(names.some(n => n.includes(m))).toBe(true);
  });

  it('all coordinates are valid selenographic values', () => {
    for (const s of ALL_SITES) {
      expect(Math.abs(s.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(s.lon)).toBeLessThanOrEqual(180);
      expect(Number.isFinite(s.lat)).toBe(true);
      expect(Number.isFinite(s.lon)).toBe(true);
      expect(s.diameterKm).toBeGreaterThanOrEqual(0);
      // near-side landing sites must sit on the Earth-facing hemisphere
      if (s.type === 'landing') expect(s.lon).toBeGreaterThan(-90);
    }
  });

  it('surface vectors point at the declared hemisphere (no inverted coordinates)', () => {
    // Aristarchus is in the NW near side: positive lat, negative lon, +X dominant
    const a = siteById('aristarchus')!;
    expect(a.lat).toBeGreaterThan(0);
    expect(a.lon).toBeLessThan(0);
    // Mare Crisium is in the east: positive longitude, near the east limb
    const c = siteById('mare-crisium')!;
    expect(c.lon).toBeGreaterThan(45);
    // south-polar Moretus must have strongly negative latitude
    expect(siteById('moretus')!.lat).toBeLessThan(-65);
  });
});
