"use client";

import { useEffect, useRef } from "react";

// A living sphere of light made of warm particles. They orbit in 3D and
// twinkle, the cloud expands on inhale and contracts on exhale (driven by the
// breath), and everything glows additively on pure black — ethereal, not a
// flat "sun". No blue anywhere.

const COUNT = 230;

type P = {
  x: number;
  y: number;
  z: number;
  size: number;
  tw: number; // twinkle phase
  spd: number; // twinkle speed
};

// Warm palette from luminous core to deep ember (front -> back).
const COLORS: [number, number, number][] = [
  [255, 226, 194],
  [255, 138, 82],
  [244, 80, 42],
  [179, 38, 26],
];

function makeParticles(): P[] {
  const ps: P[] = [];
  for (let i = 0; i < COUNT; i++) {
    // Uniform point on the unit sphere.
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    ps.push({
      x: r * Math.cos(th),
      y: r * Math.sin(th),
      z: u,
      size: 0.7 + Math.random() * 1.2,
      tw: Math.random() * Math.PI * 2,
      spd: 0.5 + Math.random() * 1.2,
    });
  }
  return ps;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function BreathingOrb({
  scale,
  phaseMs,
  dimmed,
}: {
  scale: number;
  phaseMs: number;
  dimmed: boolean;
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
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

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

    // Breath scale tween + dim fade, animated independently of React.
    const tween = { cur: 0.4, from: 0.4, to: 0.4, start: 0, dur: 1 };
    let dim = 0;
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const p = propsRef.current;

      if (tween.to !== p.scale) {
        tween.from = tween.cur;
        tween.to = p.scale;
        tween.start = now;
        tween.dur = Math.max(200, p.phaseMs);
      }
      const t = Math.min(1, (now - tween.start) / tween.dur);
      tween.cur = tween.from + (tween.to - tween.from) * easeInOut(t);

      dim += ((p.dimmed ? 1 : 0) - dim) * 0.04;
      const vis = 1 - dim;

      ctx.clearRect(0, 0, size, size);
      if (vis < 0.01) return;

      const R = size * 0.33 * tween.cur;
      const rot = now * (reduce ? 0.00002 : 0.00014);
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      ctx.globalCompositeOperation = "lighter";

      // Soft body glow behind the particles.
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
      g.addColorStop(0, `rgba(255,150,90,${0.5 * vis})`);
      g.addColorStop(0.4, `rgba(244,80,42,${0.2 * vis})`);
      g.addColorStop(1, "rgba(179,38,26,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
      ctx.fill();

      const twAmp = reduce ? 0.15 : 0.45;
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        // Subtle surface shimmer.
        const jit = 1 + 0.04 * Math.sin(now * 0.002 * pt.spd + pt.tw);
        const x = pt.x * jit;
        const z = pt.z * jit;
        const xr = x * cosR - z * sinR;
        const zr = x * sinR + z * cosR;
        const depth = (zr + 1) / 2; // 0 back .. 1 front

        const sx = cx + xr * R;
        const sy = cy + pt.y * jit * R;
        const tw = 1 - twAmp + twAmp * Math.sin(now * 0.001 * pt.spd * 2 + pt.tw);
        const alpha = (0.12 + 0.6 * depth) * tw * vis;
        const persp = 0.55 + 0.45 * depth;
        const rad = pt.size * persp * (size / 300);

        const ci = depth > 0.7 ? 0 : depth > 0.45 ? 1 : depth > 0.2 ? 2 : 3;
        const col = COLORS[ci];

        // Glow halo.
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(sx, sy, rad * 2.6, 0, Math.PI * 2);
        ctx.fill();
        // Crisp core.
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
        ctx.fill();
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
      className="h-80 w-80"
      style={{ maxWidth: "86vw", maxHeight: "86vw" }}
    />
  );
}
