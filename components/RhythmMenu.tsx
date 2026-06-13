"use client";

import { RHYTHMS } from "@/lib/rhythms";

// Pre-session choices kept to a whisper: rhythm + duration, no list chrome.
// Only the active choice is luminous; everything else recedes.

const ADAPTIVE_ID = "adaptativo";

const DESC: Record<string, string> = {
  coherencia: "el equilibrio",
  "478": "para soltar el día",
  caja: "calma estable",
  [ADAPTIVE_ID]: "se ajusta a tu HRV",
};

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
    { id: ADAPTIVE_ID, label: "Adaptativo" },
  ];

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-9">
      <div className="flex flex-col items-center gap-1.5">
        {options.map((o, i) => {
          const on = selectedId === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={`rise rhythm ${on ? "rhythm--on" : "rhythm--off"}`}
              style={{ animationDelay: `${0.2 + i * 0.07}s` }}
            >
              <span className="rhythm__name">{o.label}</span>
              {on && <span className="rhythm__desc">{DESC[o.id]}</span>}
            </button>
          );
        })}
      </div>

      <div
        className="rise flex items-center gap-7"
        style={{ animationDelay: "0.55s" }}
      >
        {[5, 10, 30].map((m) => (
          <button
            key={m}
            onClick={() => onMinutes(m)}
            className={`seg ${minutes === m ? "seg--on" : "seg--off"}`}
          >
            {m}
            <span className="seg__u">min</span>
          </button>
        ))}
      </div>

      <button
        onClick={onStart}
        className="start rise"
        style={{ animationDelay: "0.7s" }}
        aria-label="Empezar"
      >
        <span className="start__ring" />
        <span className="start__core" />
        <span className="start__label">Empezar</span>
      </button>
    </div>
  );
}
