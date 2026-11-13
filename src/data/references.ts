// External reference links for LunaNav.
// Gazetteer feature IDs verified against the IAU/USGS Gazetteer of Planetary
// Nomenclature (Nov 2026): each page's center coordinates and diameter were
// cross-checked against this dataset before the ID was recorded.
import type { Landmark } from './landmarks';

export interface Reference {
  id: string;
  label: string;
  url: string;
}

export const GAZETTEER_BASE = 'https://planetarynames.wr.usgs.gov';

export const GAZETTEER_FEATURE_IDS: Record<string, number> = {
  tycho: 6163,
  kepler: 2990,
  copernicus: 1296,
  clavius: 1236,
  aristarchus: 380,
  plato: 4757,
  'mare-tranquillitatis': 3691,
  'mare-serenitatis': 3686,
  'mare-imbrium': 3678,
  'mare-vaporum': 3694,
  'mare-crisium': 3671,
  'oceanus-procellarum': 4395,
};

export function gazetteerFeatureUrl(landmark: Landmark): string {
  const id = GAZETTEER_FEATURE_IDS[landmark.id];
  return id ? `${GAZETTEER_BASE}/Feature/${id}` : GAZETTEER_BASE;
}

/** All project references — every attribution used anywhere in the app. */
export const REFERENCES: Reference[] = [
  { id: 'gazetteer', label: 'IAU Gazetteer of Planetary Nomenclature', url: GAZETTEER_BASE },
  { id: 'iau', label: 'IAU', url: 'https://www.iau.org/' },
  { id: 'svs', label: 'NASA SVS · CGI Moon Kit', url: 'https://svs.gsfc.nasa.gov/4720' },
  { id: 'svs-models', label: 'NASA Moon 3D Models', url: 'https://svs.gsfc.nasa.gov/14959' },
  { id: 'nasa-guide', label: 'NASA Daily Moon Guide', url: 'https://science.nasa.gov/moon/daily-moon-guide/' },
  { id: 'lroc', label: 'LRO · LROC Imaging', url: 'https://lroc.sese.asu.edu/' },
  { id: 'engine', label: 'astronomy-engine', url: 'https://github.com/cosinekitty/astronomy' },
];

export const IAU_URL = 'https://www.iau.org/';