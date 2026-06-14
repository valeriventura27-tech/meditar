"use client";

import { useEffect, useRef } from "react";

// A living warm-red dot that expands on inhale and contracts on exhale, with a
// soft breathing glow and rings of energy emanating outward — the original
// brief's dot, but alive. Pure warm red (no blue).

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

type Props = { scale: number; phaseMs: number; dimmed: boolean };

export function BreathingDot({ scale, phaseMs, dimmed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ scale, phaseMs, dimmed });
  propsRef.current = { scale, phaseMs, dimmed };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let half = 0;
    let cx = 0;
    let cy = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const size = rect.width;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      half = size / 2;
      cx = half;
      cy = half;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tween = { cur: 0.4, from: 0.4, to: 0.4, start: 0, dur: 1 };
    let dim = 0;
    let raf = 0;
    let lastDraw = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastDraw < 33) return; // ~30fps
      lastDraw = now;

      const p = propsRef.current;
      if (tween.to !== p.scale) {
        tween.from = tween.cur;
        tween.to = p.scale;
        tween.start = now;
        tween.dur = Math.max(200, p.phaseMs);
      }
      const k = Math.min(1, (now - tween.start) / tween.dur);
      tween.cur = tween.from + (tween.to - tween.from) * easeInOut(k);
      dim += ((p.dimmed ? 1 : 0) - dim) * 0.03;
      const vis = 1 - dim;

      ctx.clearRect(0, 0, half * 2, half * 2);
      if (vis < 0.01) return;

      const base = half * 0.34; // dot radius at full inhale
      const r = base * tween.cur;
      ctx.globalCompositeOperation = "lighter";

      // soft breathing halo around a pure dot
      const aura = 0.85 + 0.15 * Math.sin(now * 0.0016);
      const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.8);
      gl.addColorStop(0, `rgba(244,80,42,${0.42 * aura * vis})`);
      gl.addColorStop(0.45, `rgba(179,38,26,${0.14 * vis})`);
      gl.addColorStop(1, "rgba(120,20,12,0)");
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // warm core dot
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      core.addColorStop(0, `rgba(255,170,110,${0.95 * vis})`);
      core.addColorStop(0.4, `rgba(255,138,82,${0.9 * vis})`);
      core.addColorStop(0.75, `rgba(244,80,42,${0.8 * vis})`);
      core.addColorStop(1, "rgba(179,38,26,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

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
