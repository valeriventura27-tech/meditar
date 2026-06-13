"use client";

import { useEffect, useRef, useState } from "react";
import type { PhaseName, Rhythm } from "./rhythms";
import { pulseForPhase } from "./haptics";

// Dot scale per phase. Hold keeps whatever scale the previous phase reached.
const SCALE = { inhala: 1.0, exhala: 0.4 } as const;

export type BreathingState = {
  phase: PhaseName | null;
  scale: number;
  phaseMs: number; // duration of the current phase, for the CSS transition
  remainingSeconds: number;
};

export function useBreathingEngine(
  rhythm: Rhythm,
  totalSeconds: number,
  running: boolean,
  onComplete: () => void,
  onPhaseChange?: (phase: PhaseName, seconds: number) => void,
): BreathingState {
  const [state, setState] = useState<BreathingState>({
    phase: null,
    scale: SCALE.exhala,
    phaseMs: 0,
    remainingSeconds: totalSeconds,
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const startAt = useRef(0);
  const lastScale = useRef<number>(SCALE.exhala);
  // Keep latest values without re-arming effects every render.
  const rhythmRef = useRef(rhythm);
  const onCompleteRef = useRef(onComplete);
  const onPhaseChangeRef = useRef(onPhaseChange);
  rhythmRef.current = rhythm;
  onCompleteRef.current = onComplete;
  onPhaseChangeRef.current = onPhaseChange;

  useEffect(() => {
    if (!running) return;

    startAt.current = Date.now();
    lastScale.current = SCALE.exhala;
    let cycle = rhythmRef.current.cycle(0);
    let index = 0;

    const runPhase = () => {
      const elapsed = Date.now() - startAt.current;
      if (elapsed >= totalSeconds * 1000) {
        onCompleteRef.current();
        return;
      }
      if (index >= cycle.length) {
        cycle = rhythmRef.current.cycle(elapsed);
        index = 0;
      }
      const phase = cycle[index];
      const target =
        phase.name === "manten" ? lastScale.current : SCALE[phase.name];
      lastScale.current = target;

      pulseForPhase(phase.name);
      onPhaseChangeRef.current?.(phase.name, phase.seconds);
      setState((s) => ({
        ...s,
        phase: phase.name,
        scale: target,
        phaseMs: phase.seconds * 1000,
      }));

      index += 1;
      timer.current = setTimeout(runPhase, phase.seconds * 1000);
    };

    runPhase();

    tick.current = setInterval(() => {
      const remaining = Math.max(
        0,
        totalSeconds - (Date.now() - startAt.current) / 1000,
      );
      setState((s) => ({ ...s, remainingSeconds: remaining }));
    }, 1000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, totalSeconds]);

  return state;
}
