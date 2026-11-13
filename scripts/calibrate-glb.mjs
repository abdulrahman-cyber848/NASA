// Calibrates the NASA GLB moon model against selenographic coordinates by
// matching UV texels (known lat/lon on the equirectangular kit texture) to
// vertex positions. Produces the rotation that maps Moon-body frame -> glTF frame.
import fs from 'node:fs';

const buf = fs.readFileSync(process.argv[2] || 'public/assets/moon-model.glb');
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
let off = 12, json = null, bin = null;
while (off < buf.length) {
  const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
  const chunk = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
  else if (type === 0x004e4942) bin = chunk;
  off += 8 + len;
}
if (!json || !bin) throw new Error('missing chunks');

function accessor(idx) {
  const a = json.accessors[idx];
  const bv = json.bufferViews[a.bufferView];
  if (bv.extensions?.EXT_meshopt_compression) throw new Error('meshopt-compressed bufferView: calibrate on the plain GLB instead');
  const comp = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const byteOff = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const types = { 5126: [Float32Array, 4, 1], 5122: [Int16Array, 2, 32767], 5123: [Uint16Array, 2, 65535], 5120: [Int8Array, 1, 127], 5121: [Uint8Array, 1, 255] };
  const t = types[a.componentType];
  if (!t) throw new Error('unsupported accessor componentType ' + a.componentType);
  const [Arr, bpe, normDiv] = t;
  const div = a.normalized ? normDiv : 1;
  const stride = bv.byteStride ? bv.byteStride / bpe : comp;
  const arr = new Arr(bin.buffer, bin.byteOffset + byteOff, Math.floor((bin.length - byteOff) / bpe));
  return { a, comp, stride, f32: arr, get(i, c) { return arr[i * stride + c] / div; } };
}

// pick primitive with most vertices that has UVs
let best = null;
json.meshes.forEach((m, mi) => m.primitives.forEach((p, pi) => {
  if (p.attributes.TEXCOORD_0 == null) return;
  const n = json.accessors[p.attributes.POSITION].count;
  if (!best || n > best.n) best = { mi, pi, p, n };
}));
if (!best) throw new Error('no textured primitive');
console.log('[glb] primitive verts:', best.n);
const pos = accessor(best.p.attributes.POSITION);
const uv = accessor(best.p.attributes.TEXCOORD_0);

// node transform for the mesh (matrix or TRS), assume single level
let nodeMat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const node = (json.nodes || []).find(nd => nd.mesh === best.mi);
if (node?.matrix) nodeMat = node.matrix;
else if (node) {
  const s = node.scale || [1, 1, 1];
  // rotation quaternion -> matrix (scale applied after)
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const r = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)];
  nodeMat = [r[0] * s[0], r[1] * s[0], r[2] * s[0], 0, r[3] * s[1], r[4] * s[1], r[5] * s[1], 0, r[6] * s[2], r[7] * s[2], r[8] * s[2], 0, ...(node.translation || [0, 0, 0]), 1];
}
const xf = (p) => [
  nodeMat[0] * p[0] + nodeMat[4] * p[1] + nodeMat[8] * p[2] + nodeMat[12],
  nodeMat[1] * p[0] + nodeMat[5] * p[1] + nodeMat[9] * p[2] + nodeMat[13],
  nodeMat[2] * p[0] + nodeMat[6] * p[1] + nodeMat[10] * p[2] + nodeMat[14],
];
// center + radius from transformed accessor bounds (denormalize quantized bounds)
const pdiv = pos.a.normalized ? 32767 : 1;
const pmin = pos.a.min.map(v => v / pdiv), pmax = pos.a.max.map(v => v / pdiv);
const corners = [];
for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1])
  corners.push(xf([pmin[0] * i + pmax[0] * (1 - i), pmin[1] * j + pmax[1] * (1 - j), pmin[2] * k + pmax[2] * (1 - k)]));
const center = [0, 1, 2].map(c => corners.reduce((s, p) => s + p[c], 0) / 8);
const radius = Math.max(...corners.map(p => Math.hypot(p[0] - center[0], p[1] - center[1], p[2] - center[2])));
console.log('[glb] center', center.map(v => v.toFixed(4)), 'radius', radius.toFixed(4));

function findVertex(tu, tv) {
  let bi = -1, bd = Infinity;
  for (let i = 0; i < best.n; i += 3) {
    const du = uv.get(i, 0) - tu, dv = uv.get(i, 1) - tv;
    const d = du * du + dv * dv;
    if (d < bd) { bd = d; bi = i; }
  }
  const p = xf([pos.get(bi, 0), pos.get(bi, 1), pos.get(bi, 2)]);
  const v = [p[0] - center[0], p[1] - center[1], p[2] - center[2]];
  const l = Math.hypot(...v);
  return { v: v.map(x => x / l), err: Math.sqrt(bd), uv: [uv.get(bi, 0), uv.get(bi, 1)] };
}
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function calibrate(flipV) {
  const V = (lon, lat) => findVertex((lon + 180) / 360, flipV ? 1 - (90 - lat) / 180 : (90 - lat) / 180);
  const X = V(0, 0), Y = V(90, 0), Z = V(0, 82);
  // Gram-Schmidt: Z pole first (most reliable), then X
  const z = norm(Z.v);
  let x = X.v.map((c, i) => c - z[i] * dot(X.v, z));
  x = norm(x);
  const y = cross(z, x);
  const align = dot(y, Y.v); // should be ≈ +1
  const det = dot(cross(x, y), z);
  return { x, y, z, align, det, errs: [X.err, Y.err, Z.err] };
}
let cal = calibrate(false), flipV = false;
if (cal.align < 0.9) { const alt = calibrate(true); if (alt.align > cal.align) { cal = alt; flipV = true; } }
console.log('[glb] align', cal.align.toFixed(4), 'det', cal.det.toFixed(4), 'uv errors', cal.errs.map(e => e.toFixed(5)), 'flipV', flipV);
const ok = cal.align > 0.985 && cal.det > 0.98 && Math.max(...cal.errs) < 0.01;
const out = {
  calibrated: ok,
  // columns = images of body X,Y,Z in glTF frame (row-major 3x3 listed row-wise)
  matrix: [cal.x[0], cal.y[0], cal.z[0], cal.x[1], cal.y[1], cal.z[1], cal.x[2], cal.y[2], cal.z[2]],
  center, radius, flipV, align: cal.align,
  note: 'Derived by UV-to-vertex matching against NASA CGI kit equirectangular texture; maps selenographic body frame to glTF frame.',
};
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/glb-calibration.json', JSON.stringify(out, null, 2));
console.log(ok ? 'GLB_CALIBRATION_OK' : 'GLB_CALIBRATION_FAILED — model will render without landmark calibration');