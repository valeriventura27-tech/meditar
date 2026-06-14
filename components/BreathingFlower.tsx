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

      // faint warm bed + a soft breathing aura
      const aura = 0.5 + 0.5 * Math.sin(now * 0.0012);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, extent * 1.3);
      g.addColorStop(0, `rgba(180,30,14,${(0.14 + 0.06 * aura) * vis})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, half * 2, half * 2);

      // a wave of energy travelling outward through the lattice
      const pulseR = ((now % 4200) / 4200) * extent * 1.15;
      const glowW = Math.max(1, rad * 0.34);
      const coreW = Math.max(0.5, rad * 0.12);

      ctx.globalCompositeOperation = "lighter";
      for (let i = -RINGS; i <= RINGS; i++) {
        for (let j = -RINGS; j <= RINGS; j++) {
          if ((Math.abs(i) + Math.abs(j) + Math.abs(i + j)) / 2 > RINGS) continue;
          const x = i * ax + j * bx;
          const y = j * by;
          const px = cx + x * cosR - y * sinR;
          const py = cy + x * sinR + y * cosR;
          const dc = Math.hypot(x, y);

          const depth = 1 - 0.5 * smoothstep(extent * 0.25, extent, dc);
          const shimmer = reduce ? 1 : 0.62 + 0.38 * Math.sin(now * 0.0026 + i * 1.7 + j * 2.3);
          const pulse = Math.exp(-Math.pow((dc - pulseR) / (extent * 0.14), 2));
          const a = Math.min(1, 0.55 * shimmer + pulse) * depth * vis;
          if (a <= 0.012) continue;

          // soft glow pass
          ctx.lineWidth = glowW;
          ctx.strokeStyle = `rgba(220,32,15,${0.2 * a})`;
          ctx.beginPath();
          ctx.arc(px, py, rad, 0, Math.PI * 2);
          ctx.stroke();
          // bright neon core pass
          ctx.lineWidth = coreW;
          ctx.strokeStyle = `rgba(255,96,56,${0.92 * a})`;
          ctx.beginPath();
          ctx.arc(px, py, rad, 0, Math.PI * 2);
          ctx.stroke();
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
