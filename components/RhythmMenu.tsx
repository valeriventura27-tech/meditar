"use client";

import { RHYTHMS } from "@/lib/rhythms";

// Pre-session choices: a rhythm (plus the adaptive option) and a duration.
// Sparse and editorial for night-time, eyes-closing use.

const ADAPTIVE_ID = "adaptativo";

const DESC: Record<string, string> = {
  coherencia: "equilibrio · por defecto",
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
    <div className="flex w-full max-w-xs flex-col items-center gap-10">
      <div className="w-full">
        {options.map((o, i) => {
          const on = selectedId === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={`rise rhythm ${on ? "rhythm--on" : "rhythm--off"}`}
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              <span className="rhythm__name">{o.label}</span>
              <span className="rhythm__desc">{DESC[o.id]}</span>
            </button>
          );
        })}
      </div>

      <div
        className="rise grid w-full grid-cols-3 gap-2"
        style={{ animationDelay: "0.55s" }}
      >
        {[5, 10, 30].map((m) => (
          <button
            key={m}
            onClick={() => onMinutes(m)}
            className={`seg ${minutes === m ? "seg--on" : "seg--off"}`}
          >
            {m} MIN
          </button>
        ))}
      </div>

      <button
        onClick={onStart}
        className="start rise"
        style={{ animationDelay: "0.7s" }}
        aria-label="Comenzar"
      >
        <span className="start__ring" />
        <span className="start__core" />
        <span className="start__label">Empezar</span>
      </button>
    </div>
  );
}
