// Preview of an Apple Watch "Breathe"-style flower-of-life: overlapping
// translucent circles on a hex lattice, additively brightened so the vesica
// overlaps form the mandala. Warm palette. Renders a PNG to judge it.
//
// Usage: node scripts/preview-flower.mjs [spread 0..1] [rot] [out.png]

import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 320;
const SPREAD = Number(process.argv[2] ?? 1.0); // breath: 0 merged .. 1 bloomed
const ROT = Number(process.argv[3] ?? 0.3);
const OUT = process.argv[4] ?? "/tmp/flower.png";
const TIME = Number(process.argv[5] ?? 2.4);

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const fract = (v) => v - Math.floor(v);
function hash(x, y, z) {
  let px = fract(x * 0.3183099 + 0.1), py = fract(y * 0.3183099 + 0.2), pz = fract(z * 0.3183099 + 0.3);
  px *= 17; py *= 17; pz *= 17;
  return fract(px * py * pz * (px + py + pz));
}
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(
    L(L(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), L(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy),
    L(L(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), L(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy),
    fz,
  );
}
function fbm(x, y, z) {
  let a = 0.5, s = 0;
  for (let i = 0; i < 4; i++) { s += a * noise(x, y, z); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; z = z * 2.03 - 3.3; a *= 0.5; }
  return s;
}

const RINGS = 4; // more rings -> more detail
const breathScale = 0.12 + 0.88 * SPREAD; // collapses to a point on exhale
const R = 0.105 * breathScale; // smaller circles
const spacing = R * 0.98; // flower-of-life overlap; whole thing breathes
const Rmax = RINGS * spacing * 1.04;

function centers() {
  const pts = [];
  const ax = spacing, bx = spacing * 0.5, by = spacing * 0.8660254;
  for (let i = -RINGS; i <= RINGS; i++) {
    for (let j = -RINGS; j <= RINGS; j++) {
      const hexDist = (Math.abs(i) + Math.abs(j) + Math.abs(i + j)) / 2;
      if (hexDist > RINGS) continue;
      const x = i * ax + j * bx;
      const y = j * by;
      const dl = Math.hypot(x, y);
      const zf = Math.sqrt(Math.max(0, 1 - (dl / Rmax) ** 2));
      pts.push([
        x * Math.cos(ROT) - y * Math.sin(ROT),
        x * Math.sin(ROT) + y * Math.cos(ROT),
        0.42 + 0.58 * zf,
        0.32 + 0.68 * zf,
      ]);
    }
  }
  return pts;
}
const C = centers();

function shade(x, y) {
  // sacred geometry — clearly visible, softly drawn
  let s = 0;
  for (let i = 0; i < C.length; i++) {
    const reff = R * C[i][2];
    const dx = x - C[i][0], dy = y - C[i][1];
    const d = Math.sqrt(dx * dx + dy * dy) / reff;
    s += smoothstep(0.62, 0.93, d) * (1 - smoothstep(0.93, 1.22, d)) * C[i][3];
  }
  const geom = s * 1.05;

  const dist = Math.hypot(x, y);
  // smoke as atmosphere around/through the geometry (not a veil over it)
  const t = TIME;
  const wx = fbm(x * 1.6 + t * 0.2, y * 1.6, t * 0.15);
  const wy = fbm(x * 1.6, y * 1.6 + t * 0.2, t * 0.15 + 3);
  let smk = fbm(x * 2.2 + 1.4 * wx, y * 2.2 + 1.4 * wy - t * 0.3, t * 0.2);
  smk = Math.pow(Math.max(smk, 0), 1.3);
  const orbMask = Math.exp(-Math.pow(dist / (Rmax * 1.3), 2));
  smk *= orbMask;

  const bloom = Math.exp(-dist * 2.3) * 0.4;
  const val = geom * 1.0 + smk * 1.0 + bloom;
  const lum = 1 - Math.exp(-val * 1.5);
  const hi = smoothstep(0.74, 1.0, lum);
  const r = lum;
  const g = lum * lum * 0.18 + hi * 0.2;
  const b = lum * lum * 0.05 + hi * 0.09;
  const vig = smoothstep(1.3, 0.85, dist);
  return [r * vig, g * vig, b * vig];
}

const rgba = Buffer.alloc(SIZE * SIZE * 4);
for (let yy = 0; yy < SIZE; yy++) {
  for (let xx = 0; xx < SIZE; xx++) {
    const x = (xx * 2 - SIZE) / SIZE;
    const y = -((yy * 2 - SIZE) / SIZE);
    const [r, g, b] = shade(x, y);
    const i = (yy * SIZE + xx) * 4;
    rgba[i] = clamp(r, 0, 1) * 255;
    rgba[i + 1] = clamp(g, 0, 1) * 255;
    rgba[i + 2] = clamp(b, 0, 1) * 255;
    rgba[i + 3] = 255;
  }
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const tt = Buffer.from(type, "ascii"); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tt, data])), 0); return Buffer.concat([len, tt, data, crc]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) { raw[y * (SIZE * 4 + 1)] = 0; rgba.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4); }
writeFileSync(OUT, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(`wrote ${OUT} (spread=${SPREAD}, rot=${ROT})`);
