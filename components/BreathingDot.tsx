"use client";

// The warm red dot. It expands on inhale and contracts on exhale, with an
// ease-in-out transition that lasts exactly the current phase.

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
      className="h-64 w-64 rounded-full"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, #ff8a52 0%, #f4502a 35%, #b3261a 65%, rgba(179,38,26,0) 75%)",
        transform: `scale(${scale})`,
        transition: `transform ${phaseMs}ms ease-in-out, opacity 18s ease-in`,
        opacity: dimmed ? 0 : 1,
        willChange: "transform, opacity",
      }}
    />
  );
}
