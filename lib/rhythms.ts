// Breathing rhythms. A rhythm is a function that, given the elapsed session
// time, returns the current cycle of phases. Fixed rhythms ignore the elapsed
// time; the adaptive rhythm uses it to ramp from a slower start to coherence.

export type PhaseName = "inhala" | "manten" | "exhala";

export type Phase = {
  name: PhaseName;
  seconds: number;
};

export type Rhythm = {
  id: string;
  label: string;
  // Whether this rhythm needs HealthKit (HRV) to choose its starting point.
  adaptive?: boolean;
  // Returns the phases for the cycle that is current at `elapsedMs`.
  cycle: (elapsedMs: number) => Phase[];
};

const fixed = (id: string, label: string, phases: Phase[]): Rhythm => ({
  id,
  label,
  cycle: () => phases,
});

// 5.5 breaths/min = 5.45s inhale + 5.45s exhale, no hold.
export const COHERENCE_55: Phase[] = [
  { name: "inhala", seconds: 5.45 },
  { name: "exhala", seconds: 5.45 },
];

export const RHYTHMS: Rhythm[] = [
  fixed("coherencia", "Coherencia 5,5/min", COHERENCE_55),
  fixed("478", "4 · 7 · 8", [
    { name: "inhala", seconds: 4 },
    { name: "manten", seconds: 7 },
    { name: "exhala", seconds: 8 },
  ]),
  fixed("caja", "Caja 4 · 4 · 4 · 4", [
    { name: "inhala", seconds: 4 },
    { name: "manten", seconds: 4 },
    { name: "exhala", seconds: 4 },
    { name: "manten", seconds: 4 },
  ]),
];

// Adaptive rhythm (Layer 1). If the user's overnight HRV is below their
// baseline we start slower (~6.5/min) and ramp to 5.5/min over the first
// minutes; otherwise we start directly at 5.5/min.
const RAMP_MS = 4 * 60 * 1000; // ramp to coherence over the first 4 minutes.

function breathSecondsForRate(breathsPerMin: number): number {
  // No hold: a full breath is one inhale + one exhale.
  return 60 / breathsPerMin / 2;
}

export function makeAdaptiveRhythm(startBelowBaseline: boolean): Rhythm {
  const startRate = startBelowBaseline ? 6.5 : 5.5;
  return {
    id: "adaptativo",
    label: "Adaptativo (HRV)",
    adaptive: true,
    cycle: (elapsedMs) => {
      const t = Math.min(1, elapsedMs / RAMP_MS);
      const rate = startRate + (5.5 - startRate) * t;
      const s = breathSecondsForRate(rate);
      return [
        { name: "inhala", seconds: s },
        { name: "exhala", seconds: s },
      ];
    },
  };
}

export function cycleSeconds(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.seconds, 0);
}
