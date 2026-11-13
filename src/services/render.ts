// Software orthographic renderer for the 2D Moon.
// Uses the TRUE 3D geometry: the disc is re-projected from the equirectangular
// NASA color map using the Earth direction (libration included), and each pixel
// is shaded by the dot product with the real Sun vector in the Moon-fixed frame.
// The terminator orientation therefore emerges from astronomy, never from a mask.
import { dot, cross, norm, type MoonSnapshot, type Vec3 } from './astro';

export interface MoonTexture { data: Uint8ClampedArray; w: number; h: number }

let texPromise: Promise<MoonTexture | null> | null = null;

export function loadMoonTexture(): Promise<MoonTexture | null> {
  if (texPromise) return texPromise;
  texPromise = new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(null);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height);
        resolve({ data: d.data, w: c.width, h: c.height });
      } catch (e) {
        console.warn('[LunaNav] Moon texture decode failed:', e);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn('[LunaNav] Missing public/assets/moon-color.jpg — showing labeled placeholder shading. Run scripts/validate-assets.mjs to install NASA imagery.');
      resolve(null);
    };
    img.src = '/assets/moon-color.jpg';
  });
  return texPromise;
}

export interface ViewBasis { right: Vec3; up: Vec3; earth: Vec3 }

/** Screen basis: north up, selenographic east to the right (matches naked-eye N-hemisphere view). */
export function viewBasis(snap: MoonSnapshot): ViewBasis {
  const E = snap.earthBody;
  const z: Vec3 = [0, 0, 1];
  const d = dot(z, E);
  const up = norm([z[0] - E[0] * d, z[1] - E[1] * d, z[2] - E[2] * d]);
  const right = cross(up, E);
  return { right, up, earth: E };
}

/** Project a selenographic point to 0..1 canvas coordinates. depth > 0 = Earth-facing. */
export function projectPoint(latDeg: number, lonDeg: number, basis: ViewBasis): { x: number; y: number; depth: number } {
  const la = latDeg * Math.PI / 180, lo = lonDeg * Math.PI / 180;
  const p: Vec3 = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const x = dot(p, basis.right), y = dot(p, basis.up), depth = dot(p, basis.earth);
  return { x: 0.5 + x * 0.49, y: 0.5 - y * 0.49, depth };
}

export interface RenderOptions {
  earthshine?: number;   // faint dark-side visibility for orientation (labeled in UI)
  radiusFrac?: number;   // disc radius as fraction of half-size (default 0.98)
}

/** Render the Moon for `snap` into `canvas` (square). Returns false if texture missing (placeholder drawn). */
export function renderMoon(canvas: HTMLCanvasElement, snap: MoonSnapshot, tex: MoonTexture | null, opts: RenderOptions = {}): boolean {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx || w === 0) return !!tex;
  const img = ctx.createImageData(w, h);
  const out = img.data;
  const { right, up, earth } = viewBasis(snap);
  const S = snap.sunBody;
  const cx = w / 2, cy = h / 2;
  const R = (Math.min(w, h) / 2) * (opts.radiusFrac ?? 0.98);
  const invR = 1 / R;
  const earthshine = opts.earthshine ?? 0.065; // exaggerated for orientation, labeled in UI
  const tw = tex?.w ?? 0, th = tex?.h ?? 0, td = tex?.data;
  const PI = Math.PI;

  for (let py = 0; py < h; py++) {
    const ny = (cy - py) * invR;
    const ny2 = ny * ny;
    let row = py * w * 4;
    for (let px = 0; px < w; px++, row += 4) {
      const nx = (px - cx) * invR;
      const r2 = nx * nx + ny2;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      // surface normal in Moon-fixed frame
      const bx = right[0] * nx + up[0] * ny + earth[0] * nz;
      const by = right[1] * nx + up[1] * ny + earth[1] * nz;
      const bz = right[2] * nx + up[2] * ny + earth[2] * nz;

      const sunDot = bx * S[0] + by * S[1] + bz * S[2];
      // soft terminator (~1° wide) to avoid aliasing
      let lit = (sunDot + 0.012) / 0.038;
      lit = lit < 0 ? 0 : lit > 1 ? 1 : lit;
      lit = lit * lit * (3 - 2 * lit);

      let L: number;
      if (lit > 0) {
        const ls = (2 * sunDot) / (sunDot + nz + 1e-6); // Lommel-Seeliger (flat full moon)
        const photo = 0.72 * ls + 0.28 * sunDot;        // + Lambert component
        L = lit * Math.max(0, photo) + (1 - lit) * earthshine;
      } else {
        L = earthshine;
      }
      L *= 0.82 + 0.18 * nz; // mild limb darkening

      let r: number, g: number, b: number;
      if (td) {
        const lat = Math.asin(bz < -1 ? -1 : bz > 1 ? 1 : bz);
        const lon = Math.atan2(by, bx);
        let u = ((lon / (2 * PI) + 0.5) * tw) | 0;
        let v = ((0.5 - lat / PI) * th) | 0;
        if (u < 0) u = 0; else if (u >= tw) u = tw - 1;
        if (v < 0) v = 0; else if (v >= th) v = th - 1;
        const ti = (v * tw + u) * 4;
        r = td[ti]; g = td[ti + 1]; b = td[ti + 2];
      } else {
        r = 148; g = 156; b = 172; // labeled placeholder albedo
      }
      const edge = (1 - Math.sqrt(r2)) * R;
      const alpha = edge >= 1 ? 255 : Math.max(0, edge * 255);
      out[row] = r * L;
      out[row + 1] = g * L;
      out[row + 2] = b * L;
      out[row + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  return !!tex;
}