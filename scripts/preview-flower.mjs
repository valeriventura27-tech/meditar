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

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

const R = 0.30; // circle radius (uv units)
const spacing = R * (0.5 + 0.6 * SPREAD); // centers spread with the breath

function centers() {
  const pts = [[0, 0]];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + ROT;
    pts.push([Math.cos(a) * spacing, Math.sin(a) * spacing]);
  }
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + (k * Math.PI) / 3 + ROT;
    pts.push([Math.cos(a) * spacing * Math.sqrt(3), Math.sin(a) * spacing * Math.sqrt(3)]);
  }
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + ROT;
    pts.push([Math.cos(a) * spacing * 2, Math.sin(a) * spacing * 2]);
  }
  return pts;
}
const C = centers();

function shade(x, y) {
  let s = 0;
  for (let i = 0; i < C.length; i++) {
    const dx = x - C[i][0], dy = y - C[i][1];
    const d = Math.sqrt(dx * dx + dy * dy) / R;
    s += smoothstep(1.0, 0.82, d); // soft-edged disc
  }
  // s: 0..~4 (overlaps brighter). Warm ramp + bloom.
  const dist = Math.hypot(x, y);
  const glow = Math.exp(-dist * 2.6) * 0.25;
  let r = 1 - Math.exp(-s * 0.95 - glow * 1.0);
  let g = (1 - Math.exp(-s * 0.55 - glow * 0.4)) * 0.62;
  let b = (1 - Math.exp(-s * 0.32 - glow * 0.15)) * 0.32;
  // brighten overlap nodes toward incandescent amber
  const hot = smoothstep(2.2, 3.4, s);
  r = r + hot * 0.0; g = g + hot * 0.22; b = b + hot * 0.18;
  const vig = smoothstep(1.2, 0.6, dist);
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
