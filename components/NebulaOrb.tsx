"use client";

import { useEffect, useRef } from "react";

// A red particle nebula: hundreds of embers swirl in a spiral with depth-of-
// field (in-focus particles are crisp and bright, out-of-focus ones bloom into
// soft bokeh) and motion trails. Pure long-wavelength red to protect melatonin.
// The cloud breathes — expands on inhale, contracts on exhale.

const COUNT = 340;

type P = {
  a: number; // angle
  r: number; // normalized radius 0..1
  z: number; // depth -1..1 (focal plane at 0)
  vel: number; // angular velocity (inner particles faster -> spiral)
  size: number;
  tw: number; // twinkle phase
  sp: number; // twinkle speed
};

// Deep ember -> hot core. Only red/long-wavelength; never toward blue.
const DEEP: [number, number, number] = [110, 14, 10];
const MID: [number, number, number] = [196, 36, 22];
const HOT: [number, number, number] = [255, 74, 46];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function heatColor(h: number): [number, number, number] {
  if (h < 0.5) {
    const t = h / 0.5;
    return [lerp(DEEP[0], MID[0], t), lerp(DEEP[1], MID[1], t), lerp(DEEP[2], MID[2], t)];
  }
  const t = (h - 0.5) / 0.5;
  return [lerp(MID[0], HOT[0], t), lerp(MID[1], HOT[1], t), lerp(MID[2], HOT[2], t)];
}

function makeParticles(): P[] {
  const ps: P[] = [];
  for (let i = 0; i < COUNT; i++) {
    const r = Math.pow(Math.random(), 0.7); // denser toward the core
    ps.push({
      a: Math.random() * Math.PI * 2,
      r,
      z: Math.random() * 2 - 1,
      vel: 0.00022 * (0.5 + 1.4 * (1 - r)), // differential spin -> spiral
      size: 0.6 + Math.random() * 1.4,
      tw: Math.random() * Math.PI * 2,
      sp: 0.5 + Math.random() * 1.3,
    });
  }
  return ps;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function NebulaOrb({
  scale,
  phaseMs,
  dimmed,
  sizeClass = "h-[24rem] w-[24rem]",
}: {
  scale: number;
  phaseMs: number;
  dimmed: boolean;
  sizeClass?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ scale, phaseMs, dimmed });
  propsRef.current = { scale, phaseMs, dimmed };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = makeParticles();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let size = 0;
    let cx = 0;
    let cy = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      size = rect.width;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = size / 2;
      cy = size / 2;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tween = { cur: 0.4, from: 0.4, to: 0.4, start: 0, dur: 1 };
    let dim = 0;
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(40, now - last);
      last = now;
      const p = propsRef.current;

      if (tween.to !== p.scale) {
        tween.from = tween.cur;
        tween.to = p.scale;
        tween.start = now;
        tween.dur = Math.max(200, p.phaseMs);
      }
      const t = Math.min(1, (now - tween.start) / tween.dur);
      tween.cur = tween.from + (tween.to - tween.from) * easeInOut(t);

      dim += ((p.dimmed ? 1 : 0) - dim) * 0.03;
      const vis = 1 - dim;

      // Trails: fade the previous frame instead of clearing it. A low fade
      // keeps long, silky streaks.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(0,0,0,${0.09 + dim * 0.4})`;
      ctx.fillRect(0, 0, size, size);

      if (vis > 0.01) {
        ctx.globalCompositeOperation = "lighter";
        const R = size * 0.3 * tween.cur;

        // Hot breathing core.
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
        g.addColorStop(0, `rgba(255,80,50,${0.42 * vis})`);
        g.addColorStop(0.5, `rgba(150,24,16,${0.16 * vis})`);
        g.addColorStop(1, "rgba(90,10,8,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2);
        ctx.fill();

        const spin = reduce ? 0.15 : 1;
        for (let i = 0; i < particles.length; i++) {
          const pt = particles[i];
          pt.a += pt.vel * dt * spin;

          const sx = cx + Math.cos(pt.a) * pt.r * R;
          const sy = cy + Math.sin(pt.a) * pt.r * R * 0.92;

          const blur = Math.abs(pt.z); // 0 in focus .. 1 out of focus
          const tw = 0.6 + 0.4 * Math.sin(now * 0.001 * pt.sp + pt.tw);
          const heat = Math.min(1, 1 - pt.r + 0.25 * (1 - blur));
          const [cr, cg, cb] = heatColor(heat);

          // In focus -> small & bright; out of focus -> large & soft (bokeh).
          const rad = (pt.size + blur * 4) * (size / 320) * (0.85 + 0.3 * tween.cur);
          const alpha = (0.5 - blur * 0.34) * tw * vis;
          if (alpha <= 0) continue;

          ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
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
      className={sizeClass}
      style={{ maxWidth: "92vw", maxHeight: "92vw" }}
    />
  );
}
