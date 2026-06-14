// CPU port of the plasma fragment shader so we can SEE it without a GPU.
// Same math as components/PlasmaOrb.tsx (hash / value-noise / fbm / raymarch).
// Renders a PNG we can open. Once it looks right, the identical math goes back
// into the GLSL string.
//
// Usage: node scripts/preview-orb.mjs [scale] [time] [out.png]

import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 260;
const SCALE = Number(process.argv[2] ?? 1.0);
const TIME = Number(process.argv[3] ?? 2.4);
const OUT = process.argv[4] ?? "/tmp/orb.png";

const fract = (x) => x - Math.floor(x);
const mix = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function hash(x, y, z) {
  let px = fract(x * 0.3183099 + 0.1);
  let py = fract(y * 0.3183099 + 0.2);
  let pz = fract(z * 0.3183099 + 0.3);
  px *= 17.0;
  py *= 17.0;
  pz *= 17.0;
  return fract(px * py * pz * (px + py + pz));
}

function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const c000 = hash(ix, iy, iz);
  const c100 = hash(ix + 1, iy, iz);
  const c010 = hash(ix, iy + 1, iz);
  const c110 = hash(ix + 1, iy + 1, iz);
  const c001 = hash(ix, iy, iz + 1);
  const c101 = hash(ix + 1, iy, iz + 1);
  const c011 = hash(ix, iy + 1, iz + 1);
  const c111 = hash(ix + 1, iy + 1, iz + 1);
  return mix(
    mix(mix(c000, c100, fx), mix(c010, c110, fx), fy),
    mix(mix(c001, c101, fx), mix(c011, c111, fx), fy),
    fz,
  );
}

function fbm(x, y, z) {
  let a = 0.5, s = 0;
  for (let i = 0; i < 5; i++) {
    s += a * noise(x, y, z);
    x = x * 2.03 + 1.7;
    y = y * 2.03 + 9.2;
    z = z * 2.03 - 3.3;
    a *= 0.5;
  }
  return s;
}

function shade(uvx, uvy, t, scale) {
  const rox = 0, roy = 0, roz = -3.2;
  let rdx = uvx, rdy = uvy, rdz = 1.7;
  const rl = Math.hypot(rdx, rdy, rdz);
  rdx /= rl; rdy /= rl; rdz /= rl;
  const br = mix(0.8, 1.12, clamp((scale - 0.4) / 0.6, 0, 1));
  const ca = Math.cos(t * 0.3), sa = Math.sin(t * 0.3);

  const b = rox * rdx + roy * rdy + roz * rdz;
  const c = rox * rox + roy * roy + roz * roz - br * br;
  let h = b * b - c;
  let r = 0, g = 0, bl = 0, alpha = 0, fres = 0;
  if (h > 0) {
    h = Math.sqrt(h);
    const tn = Math.max(-b - h, 0), tf = -b + h;
    // fresnel rim from the entry point — defines the 3D sphere edge
    const enx = rox + rdx * tn, eny = roy + rdy * tn, enz = roz + rdz * tn;
    const nl = Math.hypot(enx, eny, enz) || 1;
    const ndv = -((enx / nl) * rdx + (eny / nl) * rdy + (enz / nl) * rdz);
    fres = Math.pow(1 - clamp(ndv, 0, 1), 2.6);
    const dt = (tf - tn) / 48;
    let tt = tn + dt * hash(uvx * 999, uvy * 999, 1);
    for (let i = 0; i < 48; i++) {
      const px = rox + rdx * tt, py = roy + rdy * tt, pz = roz + rdz * tt;
      const sx = ca * px - sa * pz;
      const sz = sa * px + ca * pz;
      const sy = py;
      // domain-warp for swirling filaments
      const w1 = fbm(sx * 2.0, sy * 2.0 + t, sz * 2.0);
      const w2 = fbm(sx * 2.0 + t, sy * 2.0 + 1, sz * 2.0);
      const w3 = fbm(sx * 2.0, sy * 2.0 + t * 0.7, sz * 2.0 + 2);
      const qx = sx * 3.6 + 0.9 * w1;
      const qy = sy * 3.6 + 0.9 * w2;
      const qz = sz * 3.6 + 0.9 * w3;
      // body + ridged "veins" + fine granulation for crisp surface detail
      const body = fbm(qx, qy - t * 1.4, qz);
      const ridg = 1 - Math.abs(2 * noise(qx * 1.6, qy * 1.6 - t, qz * 1.6) - 1);
      const grain = noise(qx * 4.0, qy * 4.0 - t * 1.2, qz * 4.0);
      let d = body * 0.6 + ridg * ridg * 0.5 + grain * 0.18;
      const rr = Math.hypot(px, py, pz) / br;
      let dens = smoothstep(1.02, 0.0, rr) * d;
      dens = Math.pow(Math.max(dens, 0), 1.7) * 5.2;
      const temp = dens * (1 - rr * 0.4) + (1 - rr) * 0.5; // hotter core
      let cr = mix(0.45, 1.0, smoothstep(0.0, 0.55, temp));
      let cg = mix(0.03, 0.2, smoothstep(0.0, 0.55, temp));
      let cb = mix(0.0, 0.03, smoothstep(0.0, 0.55, temp));
      const hot = smoothstep(0.75, 1.5, temp);
      cr = mix(cr, 1.0, hot);
      cg = mix(cg, 0.58, hot);
      cb = mix(cb, 0.3, hot);
      const a = dens * 0.16;
      r += cr * a * (1 - alpha);
      g += cg * a * (1 - alpha);
      bl += cb * a * (1 - alpha);
      alpha += a * (1 - alpha);
      if (alpha > 0.995) break;
      tt += dt;
    }
  }
  const dist = Math.hypot(uvx, uvy);
  // fresnel rim — a bright defined edge so it reads as a 3D orb
  r += fres * 1.0 * 0.9; g += fres * 0.34 * 0.9; bl += fres * 0.12 * 0.9;
  // a thin, restrained flame edge (much less smoke than before)
  const ca2 = Math.cos(t * 0.3), sa2 = Math.sin(t * 0.3);
  const hx = ca2 * uvx - sa2 * uvy;
  const hy = sa2 * uvx + ca2 * uvy;
  const wx = fbm(hx * 2.4, hy * 2.4, t * 0.4);
  const wy = fbm(hx * 2.4 + 5, hy * 2.4, t * 0.4 + 2);
  let wisp = fbm(hx * 3.0 + 1.0 * wx, hy * 3.0 + 1.0 * wy, t * 0.5);
  wisp = Math.pow(Math.max(wisp, 0), 2.4);
  const shell = Math.exp(-Math.abs(dist - br) * 9.0);
  const corona = shell * wisp * 1.1;
  r += 1.0 * corona; g += 0.34 * corona; bl += 0.13 * corona;
  // tight inner bloom
  const glow = Math.exp((-dist * 3.6) / br) * 0.22;
  r += 1.0 * glow; g += 0.3 * glow; bl += 0.12 * glow;

  r *= 1.18; g *= 1.18; bl *= 1.18;
  r = 1 - Math.exp(-r * 1.5); g = 1 - Math.exp(-g * 1.5); bl = 1 - Math.exp(-bl * 1.5);
  const vig = smoothstep(1.15, 0.5, dist);
  r *= vig; g *= vig; bl *= vig;
  return [r, g, bl];
}

// ---- render ----
const rgba = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const uvx = (x * 2 - SIZE) / SIZE;
    const uvy = -((y * 2 - SIZE) / SIZE);
    const [r, g, b] = shade(uvx, uvy, TIME, SCALE);
    const i = (y * SIZE + x) * 4;
    rgba[i] = clamp(r, 0, 1) * 255;
    rgba[i + 1] = clamp(g, 0, 1) * 255;
    rgba[i + 2] = clamp(b, 0, 1) * 255;
    rgba[i + 3] = 255;
  }
}

// ---- minimal PNG encoder ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  rgba.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(OUT, png);
console.log(`wrote ${OUT} (${SIZE}x${SIZE}, scale=${SCALE}, t=${TIME})`);
