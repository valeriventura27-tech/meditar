"use client";

import type { PhaseName } from "@/lib/rhythms";

const TEXT: Record<PhaseName, string> = {
  inhala: "Inhala",
  manten: "Mantén",
  exhala: "Exhala",
};

export function PhaseLabel({ phase }: { phase: PhaseName | null }) {
  return (
    <p className="phase" style={{ opacity: phase ? 0.5 : 0 }}>
      {phase ? TEXT[phase] : " "}
    </p>
  );
}
