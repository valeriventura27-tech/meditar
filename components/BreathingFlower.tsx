"use client";

import { useEffect, useRef } from "react";

// Apple Watch "Breathe"-style Flower of Life, drawn as crisp red circle
// outlines on a hex lattice. The overlapping rings form an intricate
// sacred-geometry mandala that blooms open on inhale and tightens on exhale,
// with a slow rotation. Pure red only (no blue, for melatonin).

const RF = 0.135; // circle radius as a fraction of the half-size (small)
const RINGS = 3; // hex-lattice rings -> intricate detail

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
      const spacing = Rpx * (0.82 + 0.32 * spread);
      const rot = reduce ? 0.3 : now * 0.00004 + 0.2;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const ax = spacing;
      const bx = spacing * 0.5;
      const by = spacing * 0.8660254;

      // faint warm bed so it isn't stark on black
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, spacing * 3.6);
      g.addColorStop(0, `rgba(150,16,8,${0.16 * vis})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, half * 2, half * 2);

      // crisp red ring lattice, additive so intersections glow
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = Rpx * 0.15;
      ctx.strokeStyle = `rgba(220,22,11,${0.72 * vis})`;
      for (let i = -RINGS; i <= RINGS; i++) {
        for (let j = -RINGS; j <= RINGS; j++) {
          if ((Math.abs(i) + Math.abs(j) + Math.abs(i + j)) / 2 > RINGS) continue;
          const x = i * ax + j * bx;
          const y = j * by;
          const px = cx + x * cosR - y * sinR;
          const py = cy + x * sinR + y * cosR;
          ctx.beginPath();
          ctx.arc(px, py, Rpx, 0, Math.PI * 2);
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
