// Shared heightfield used by BOTH the renderer and the physics engine so that
// collisions happen against the exact surface the user sees.
export interface Crater { x: number; z: number; r: number; depth: number }

export const CRATERS: Crater[] = [
  { x: -7, z: -6, r: 3.2, depth: 0.8 },
  { x: 8, z: 5, r: 2.2, depth: 0.5 },
  { x: 2, z: -10, r: 4.5, depth: 1.1 },
  { x: -12, z: 7, r: 2.8, depth: 0.6 },
];

function vnoise(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const s = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return s(xi, zi) * (1 - u) * (1 - v) + s(xi + 1, zi) * u * (1 - v) + s(xi, zi + 1) * (1 - u) * v + s(xi + 1, zi + 1) * u * v;
}

/** Terrain height (m) at world x,z — rolling regolith + crater bowls + rims. */
export function terrainHeight(x: number, z: number): number {
  let h = (vnoise(x * 0.18, z * 0.18) - 0.5) * 0.5
    + (vnoise(x * 0.7, z * 0.7) - 0.5) * 0.16
    + (vnoise(x * 2.3, z * 2.3) - 0.5) * 0.05;
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1) h -= c.depth * (1 - d * d) ** 2;            // bowl
    else if (d < 1.35) h += c.depth * 0.22 * Math.sin((d - 1) / 0.35 * Math.PI); // rim
  }
  return h - 0.1;
}

/** Surface normal via central differences of the heightfield. */
export function terrainNormal(x: number, z: number, eps = 0.08): { x: number; y: number; z: number } {
  const hx = terrainHeight(x + eps, z) - terrainHeight(x - eps, z);
  const hz = terrainHeight(x, z + eps) - terrainHeight(x, z - eps);
  const nx = -hx / (2 * eps), nz = -hz / (2 * eps);
  const l = Math.hypot(nx, 1, nz);
  return { x: nx / l, y: 1 / l, z: nz / l };
}

export const slopeDeg = (x: number, z: number) => Math.acos(terrainNormal(x, z).y) * 180 / Math.PI;