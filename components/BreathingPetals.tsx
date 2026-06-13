"use client";

// Apple Watch "Breathe"-style bloom: six overlapping translucent circles
// arranged like a flower. The cluster blooms (scales up) on inhale and folds
// (scales down) on exhale, with a slow continuous rotation for life. Warm
// palette only — overlaps glow via screen blending on pure black.

const PETALS = 6;

export function BreathingPetals({
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
      className="petals"
      style={{
        transform: `scale(${scale})`,
        transition: `transform ${phaseMs}ms ease-in-out, opacity 18s ease-in`,
        opacity: dimmed ? 0 : 1,
      }}
    >
      <div className="petals__glow" />
      <div className="petals__spin">
        {Array.from({ length: PETALS }).map((_, i) => (
          <span
            key={i}
            className="petal"
            style={{
              transform: `translate(-50%, -50%) rotate(${(360 / PETALS) * i}deg) translateY(-3.4rem)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
