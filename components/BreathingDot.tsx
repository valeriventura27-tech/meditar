"use client";

// The warm orb. It expands on inhale and contracts on exhale, but it should
// feel alive and magical — not a flat circle. Layers compose a luminous core,
// a soft glow, a breathing aura and a slow liquid shimmer. The breath drives
// the overall scale; the inner animations give it life of its own.

export function BreathingDot({
  scale,
  phaseMs,
  dimmed,
}: {
  scale: number;
  phaseMs: number;
  dimmed: boolean;
}) {
  return (
    <div
      className="orb"
      style={{
        transform: `scale(${scale})`,
        transition: `transform ${phaseMs}ms ease-in-out, opacity 18s ease-in`,
        opacity: dimmed ? 0 : 1,
      }}
    >
      <div className="orb__layer orb__aura" />
      <div className="orb__layer orb__shimmer" />
      <div className="orb__layer orb__glow" />
      <div className="orb__layer orb__core" />
    </div>
  );
}
