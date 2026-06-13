"use client";

import { RHYTHMS } from "@/lib/rhythms";

// Pre-session choices: a rhythm (plus the adaptive option) and a duration.
// Kept deliberately sparse for night-time, eyes-closing use.

const ADAPTIVE_ID = "adaptativo";

export function RhythmMenu({
  selectedId,
  onSelect,
  minutes,
  onMinutes,
  onStart,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  minutes: number;
  onMinutes: (m: number) => void;
  onStart: () => void;
}) {
  const options = [
    ...RHYTHMS.map((r) => ({ id: r.id, label: r.label })),
    { id: ADAPTIVE_ID, label: "Adaptativo (HRV)" },
  ];

  return (
    <div className="flex flex-col items-center gap-8 px-8">
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            className="rounded-full py-3 text-sm tracking-wide transition-colors"
            style={{
              color: selectedId === o.id ? "#e09a7a" : "#8a7d72",
              border: `1px solid ${selectedId === o.id ? "#b3261a" : "#2a211d"}`,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        {[5, 10, 30].map((m) => (
          <button
            key={m}
            onClick={() => onMinutes(m)}
            className="rounded-full px-4 py-2 text-xs transition-colors"
            style={{
              color: minutes === m ? "#e09a7a" : "#5c5248",
              border: `1px solid ${minutes === m ? "#b3261a" : "#2a211d"}`,
            }}
          >
            {m} min
          </button>
        ))}
      </div>

      <button
        onClick={onStart}
        className="mt-2 rounded-full px-10 py-4 text-base tracking-widest"
        style={{ color: "#cdbfb3", border: "1px solid #b3261a" }}
      >
        Comenzar
      </button>
    </div>
  );
}
