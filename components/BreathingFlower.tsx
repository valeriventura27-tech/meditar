"use client";

import { useEffect, useRef } from "react";

// Apple Watch "Breathe"-style flower of life: 19 translucent circles on a hex
// lattice, additively blended ('lighter') so the vesica overlaps form a crisp
// mandala. It blooms open on inhale and merges into a bright core on exhale,
// with a slow rotation. Warm palette only (no blue, for melatonin).

const RF = 0.22; // circle radius as a fraction of the half-size (smaller mandala)

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

    const disc = (x: number, y: number, a: number) => {
      // Pure red, mostly solid with a crisp edge so circles read as defined.
      const g = ctx.createRadialGradient(x, y, 0, x, y, Rpx);
      g.addColorStop(0, `rgba(226,16,8,${0.52 * a})`);
      g.addColorStop(0.78, `rgba(205,12,6,${0.46 * a})`);
      g.addColorStop(0.9, `rgba(140,8,4,${0.3 * a})`);
      g.addColorStop(1, "rgba(140,8,4,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, Rpx, 0, Math.PI * 2);
      ctx.fill();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const p = propsRef.current;
      const target = (p.scale - 0.4) / 0.6; // 0 (exhale) .. 1 (inhale)
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
      const spacing = Rpx * (0.5 + 0.62 * spread);
      const rot = reduce ? 0.4 : now * 0.00004 + 0.3;

      ctx.globalCompositeOperation = "lighter";
      disc(cx, cy, vis);
      for (let k2 = 0; k2 < 6; k2++) {
        const a = (k2 * Math.PI) / 3 + rot;
        disc(cx + Math.cos(a) * spacing, cy + Math.sin(a) * spacing, vis);
      }
      const s3 = spacing * Math.sqrt(3);
      for (let k2 = 0; k2 < 6; k2++) {
        const a = Math.PI / 6 + (k2 * Math.PI) / 3 + rot;
        disc(cx + Math.cos(a) * s3, cy + Math.sin(a) * s3, vis);
      }
      for (let k2 = 0; k2 < 6; k2++) {
        const a = (k2 * Math.PI) / 3 + rot;
        disc(cx + Math.cos(a) * spacing * 2, cy + Math.sin(a) * spacing * 2, vis);
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
