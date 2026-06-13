"use client";

import type { ReactNode } from "react";

// Gentler Streak-style circular gauge: a 270° warm arc that fills with the
// value, a marker at the tip, and free-form content in the centre.

const R = 84;
const C = 2 * Math.PI * R;
const SWEEP = 0.75; // 270° of the circle, gap at the bottom
const TRACK = SWEEP * C;

export function Gauge({
  fill,
  children,
}: {
  fill: number;
  children: ReactNode;
}) {
  const v = Math.max(0, Math.min(1, fill));
  const theta = ((135 + v * 270) * Math.PI) / 180;
  const mx = 100 + R * Math.cos(theta);
  const my = 100 + R * Math.sin(theta);

  return (
    <div className="gauge">
      <svg viewBox="0 0 200 200" className="gauge__svg">
        <defs>
          <linearGradient id="gaugeWarm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffb27a" />
            <stop offset="55%" stopColor="#f4502a" />
            <stop offset="100%" stopColor="#b3261a" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="#2a1812"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${TRACK} ${C}`}
          transform="rotate(135 100 100)"
        />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="url(#gaugeWarm)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${v * TRACK} ${C}`}
          transform="rotate(135 100 100)"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <circle cx={mx} cy={my} r="6.5" fill="#ffd6b0" />
      </svg>
      <div className="gauge__center">{children}</div>
    </div>
  );
}
