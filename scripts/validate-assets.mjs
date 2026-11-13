// LunaNav asset pipeline: validates NASA CGI Moon Kit downloads, converts them
// to web formats, and verifies orientation/encoding before the app uses them.
// Sources: https://svs.gsfc.nasa.gov/4720 (LRO WAC color, LOLA DEM)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = '/tmp/nasa';
const OUT = path.resolve('public/assets');
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log('[assets]', ...a);

// ---------- Color map ----------
const colorTif = path.join(SRC, 'lroc_color_poles_2k.tif');
const meta = await sharp(colorTif).metadata();
log('color source:', meta.format, `${meta.width}x${meta.height}`, meta.channels + 'ch');
if (meta.width !== 2048 || meta.height !== 1024) throw new Error('Unexpected color map dimensions');

const { data: gray, info } = await sharp(colorTif).greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
function avg(lonDeg, latDeg, halfDeg) {
  const cx = ((lonDeg + 180) / 360) * W;
  const cy = ((90 - latDeg) / 180) * H;
  const rx = (halfDeg / 360) * W, ry = (halfDeg / 180) * H;
  let sum = 0, n = 0;
  for (let y = Math.max(0, cy - ry); y < Math.min(H, cy + ry); y++)
    for (let x = Math.max(0, cx - rx); x < Math.min(W, cx + rx); x++) {
      sum += gray[(y | 0) * W + (x | 0)]; n++;
    }
  return sum / n;
}
// Known-albedo probes (selenographic, east-positive). Verifies east-right / north-up.
const crisium = avg(59.1, 17, 4);          // dark isolated mare
const eastHighlands = avg(76, 17, 5);      // bright highlands east of Crisium
const procellarum = avg(-57.4, 18.4, 6);   // dark Oceanus Procellarum
const frigoris = avg(1.4, 56, 3);          // dark northern Mare Frigoris band
const southHigh = avg(1.4, -56, 3);        // bright southern highlands
log('probes:', { crisium: crisium.toFixed(1), eastHighlands: eastHighlands.toFixed(1), procellarum: procellarum.toFixed(1), frigoris: frigoris.toFixed(1), southHigh: southHigh.toFixed(1) });
const eastRight = crisium + 18 < eastHighlands && procellarum + 10 < eastHighlands;
const northUp = frigoris + 8 < southHigh;
if (!eastRight || !northUp) {
  throw new Error(`Orientation check failed (eastRight=${eastRight}, northUp=${northUp}) — refusing to ship a misaligned map`);
}
log('orientation verified: equirectangular, 0° centered, east to the right, north up');
await sharp(colorTif).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(OUT, 'moon-color.jpg'));

// ---------- Elevation (validated encoding) ----------
// Official NASA doc: unsigned 16-bit TIFF = signed half-meter source + 20000 offset.
// elev_m = (DN - 20000) * 0.5, relative to R = 1737.4 km.
const demTif = path.join(SRC, 'ldem_4_uint.tif');
const dm = await sharp(demTif).metadata();
const { data: rawB, info: di } = await sharp(demTif).raw().toBuffer({ resolveWithObject: true });
if (dm.channels !== 1) throw new Error('Expected single-channel DEM source');
// This libvips build loads the uint16 TIFF as 8-bit: DN8 = DN16 / 257.
// elev_m = (DN16 - 20000) * 0.5  =>  elev_m = DN8 * 128.5 - 10000.
// Validated below against the Moon's independently known topographic range.
const stride = di.channels;
const M_PER_DN = (65535 / 255) * 0.5;
let mn = Infinity, mx = -Infinity;
const out8 = Buffer.alloc(di.width * di.height);
const EMIN = -10000, EMAX = 12000; // documented linear window written to manifest
for (let i = 0; i < di.width * di.height; i++) {
  const elev = rawB[i * stride] * M_PER_DN - 10000;
  if (elev < mn) mn = elev;
  if (elev > mx) mx = elev;
  out8[i] = Math.max(0, Math.min(255, Math.round(((elev - EMIN) / (EMAX - EMIN)) * 255)));
}
log(`DEM ${di.width}x${di.height} elev range: ${mn.toFixed(0)} m .. ${mx.toFixed(0)} m (expected ≈ −9100 .. +10800)`);
if (mn < -9600 || mn > -8500 || mx < 10100 || mx > 11200) throw new Error('DEM range implausible — encoding assumption wrong');
await sharp(out8, { raw: { width: di.width, height: di.height, channels: 1 } }).png().toFile(path.join(OUT, 'moon-elevation.png'));

// ---------- Manifest ----------
const files = ['moon-color.jpg', 'moon-elevation.png'].map(f => ({ file: f, bytes: fs.statSync(path.join(OUT, f)).size }));
const manifest = {
  generatedAt: new Date().toISOString(),
  sources: {
    color: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_2k.tif',
    elevation: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_4_uint.tif',
    model: 'https://svs.gsfc.nasa.gov/vis/a010000/a014900/a014959/Moon_NASA_LRO_8k_Topo_Small.glb',
  },
  projection: 'Simple cylindrical (equirectangular), 0° longitude centered, east right, north up',
  elevationEncoding: `moon-elevation.png 8-bit gray: elev_m = DN/255 * ${EMAX - EMIN} + (${EMIN}); quantization ~${((EMAX - EMIN) / 255).toFixed(0)} m; source LOLA uint16 (DN-20000)*0.5 m; relief is exaggerated in the 3D view for visibility`,
  probes: { crisium, eastHighlands, procellarum, frigoris, southHigh },
  demRangeMeters: [mn, mx],
  files,
  credit: 'NASA/GSFC Scientific Visualization Studio — LRO LROC (color), LRO LOLA (elevation)',
};
fs.writeFileSync(path.join(OUT, 'assets-manifest.json'), JSON.stringify(manifest, null, 2));
log('manifest written', files);
console.log('ASSET_VALIDATION_OK');