"use client";

import type { PhaseName } from "@/lib/rhythms";

const TEXT: Record<PhaseName, string> = {
  inhala: "Inhala",
  manten: "Mantén",
  exhala: "Exhala",
};

export function PhaseLabel({ phase }: { phase: PhaseName | null }) {
  return (
    <p
      className="mt-16 text-lg tracking-[0.3em] uppercase"
      style={{ color: "#e09a7a", opacity: phase ? 0.45 : 0 }}
    >
      {phase ? TEXT[phase] : " "}
    </p>
  );
}
