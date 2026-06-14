"use client";

// Minimal warm HRV area+line chart (Athlytic style), no axes.

export function HrvChart({ data }: { data: number[] }) {
  const W = 300;
  const H = 96;
  const pad = 10;
  const min = Math.min(...data) - 3;
  const max = Math.max(...data) + 3;
  const xs = (i: number) => pad + (i * (W - 2 * pad)) / (data.length - 1);
  const ys = (v: number) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);

  const line = data.map((v, i) => `${xs(i)},${ys(v)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;
  const lastX = xs(data.length - 1);
  const lastY = ys(data[data.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none">
      <defs>
        <linearGradient id="hrvFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4502a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f4502a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#hrvFill)" />
      <polyline
        points={line}
        fill="none"
        stroke="#f4733a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3.6" fill="#ffd0a8" />
    </svg>
  );
}
