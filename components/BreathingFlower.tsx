"use client";

import { useEffect, useRef } from "react";

// A living Flower of Life: crisp red circle outlines on a hex lattice that
// shimmer, pulse with a wave of energy travelling outward, and glow like neon.
// It blooms open on inhale and collapses to a point on exhale. Pure warm red.

const RF = 0.105; // circle radius as a fraction of the half-size
const RINGS = 4; // hex-lattice rings -> intricate detail

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

type Props = { scale: number; phaseMs: number; dimmed: boolean };

export function BreathingFlower({ scale, phaseMs, dimmed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ scale, phaseMs, dimmed });
  propsRef.current = { scale, phaseMs, dimmed };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let half = 0;
    let cx = 0;
    let cy = 0;
    let Rpx = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const size = rect.width;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      half = size / 2;
      cx = half;
      cy = half;
      Rpx = half * RF;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tween = { cur: 0, from: 0, to: 0, start: 0, dur: 1 };
    let dim = 0;
    let raf = 0;
    let lastDraw = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastDraw < 33) return; // ~30fps
      lastDraw = now;

      const p = propsRef.current;
      const target = (p.scale - 0.4) / 0.6;
      if (tween.to !== target) {
        tween.from = tween.cur;
        tween.to = target;
        tween.start = now;
        tween.dur = Math.max(200, p.phaseMs);
      }
      const k = Math.min(1, (now - tween.start) / tween.dur);
      tween.cur = tween.from + (tween.to - tween.from) * easeInOut(k);
      dim += ((p.dimmed ? 1 : 0) - dim) * 0.03;
      const vis = 1 - dim;

      ctx.clearRect(0, 0, half * 2, half * 2);
      if (vis < 0.01) return;

      const spread = Math.max(0, Math.min(1, tween.cur));
      const breathScale = 0.12 + 0.88 * spread; // collapses to a point on exhale
      const rad = Rpx * breathScale;
      const spacing = rad * 0.98;
      const rot = reduce ? 0.3 : now * 0.00004 + 0.2;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const ax = spacing;
      const bx = spacing * 0.5;
      const by = spacing * 0.8660254;
      const extent = spacing * RINGS + rad;

      const aura = 0.5 + 0.5 * Math.sin(now * 0.0012);
      const Rmax = spacing * RINGS * 1.04;
      const pulseR = ((now % 3400) / 3400) * extent * 1.2;

      ctx.globalCompositeOperation = "lighter";

      // strong additive bloom -> depth and glow
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, extent * 1.3);
      bloom.addColorStop(0, `rgba(150,22,10,${(0.3 + 0.12 * aura) * vis})`);
      bloom.addColorStop(0.5, `rgba(110,16,8,${0.12 * vis})`);
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(cx, cy, extent * 1.3, 0, Math.PI * 2);
      ctx.fill();

      for (let i = -RINGS; i <= RINGS; i++) {
        for (let j = -RINGS; j <= RINGS; j++) {
          if ((Math.abs(i) + Math.abs(j) + Math.abs(i + j)) / 2 > RINGS) continue;
          const x = i * ax + j * bx;
          const y = j * by;
          const dl = Math.hypot(x, y);
          // dome: foreshorten + brighten toward the centre (3D sphere)
          const zf = Math.sqrt(Math.max(0, 1 - (dl / Rmax) ** 2));
          const reff = rad * (0.42 + 0.58 * zf);
          const depthB = 0.32 + 0.68 * zf;
          const px = cx + x * cosR - y * sinR;
          const py = cy + x * sinR + y * cosR;

          const shimmer = reduce ? 0.6 : 0.5 + 0.5 * Math.sin(now * 0.0028 + i * 1.7 + j * 2.3);
          const pulse = Math.exp(-Math.pow((dl - pulseR) / (extent * 0.12), 2));
          const a = Math.min(1, 0.3 * shimmer + 0.95 * pulse) * depthB * vis;
          if (a <= 0.012) continue;

          ctx.lineWidth = Math.max(1, reff * 0.55);
          ctx.strokeStyle = `rgba(190,26,12,${0.09 * a})`;
          ctx.beginPath();
          ctx.arc(px, py, reff, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = Math.max(1, reff * 0.26);
          ctx.strokeStyle = `rgba(228,40,18,${0.2 * a})`;
          ctx.beginPath();
          ctx.arc(px, py, reff, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = Math.max(0.5, reff * 0.1);
          ctx.strokeStyle = `rgba(255,110,66,${0.95 * a})`;
          ctx.beginPath();
          ctx.arc(px, py, reff, 0, Math.PI * 2);
          ctx.stroke();

          // node of light at the vertex, flaring as the wave passes
          const na = Math.min(1, 0.16 * shimmer + 1.1 * pulse) * depthB * vis;
          if (na > 0.04) {
            const nr = reff * 0.42;
            const nd = ctx.createRadialGradient(px, py, 0, px, py, nr);
            nd.addColorStop(0, `rgba(255,150,92,${0.6 * na})`);
            nd.addColorStop(1, "rgba(255,80,40,0)");
            ctx.fillStyle = nd;
            ctx.beginPath();
            ctx.arc(px, py, nr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-[24rem] w-[24rem]"
      style={{ maxWidth: "92vw", maxHeight: "92vw" }}
    />
  );
}
