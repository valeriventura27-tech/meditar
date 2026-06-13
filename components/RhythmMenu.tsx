"use client";

import { RHYTHMS } from "@/lib/rhythms";

// Rhythm choice as a row of soft pills (Gentler Streak style). The active pill
// glows with the warm gradient.

const ADAPTIVE_ID = "adaptativo";

export const RHYTHM_SHORT: Record<string, string> = {
  coherencia: "Coherencia",
  "478": "4·7·8",
  caja: "Caja",
  [ADAPTIVE_ID]: "Adaptativo",
};

const OPTIONS = [
  ...RHYTHMS.map((r) => ({ id: r.id })),
  { id: ADAPTIVE_ID },
];

export function RhythmMenu({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="chips">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelect(o.id)}
          className={`chip ${o.id === selectedId ? "chip--on" : ""}`}
        >
          {RHYTHM_SHORT[o.id]}
        </button>
      ))}
    </div>
  );
}
