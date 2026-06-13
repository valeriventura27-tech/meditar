"use client";

import { RHYTHMS } from "@/lib/rhythms";

// One focal choice at a time — no list, no chrome. Step through rhythms with
// the chevrons; dots show where you are. Duration is a quiet row below.

const ADAPTIVE_ID = "adaptativo";

const OPTIONS = [
  ...RHYTHMS.map((r) => ({ id: r.id, label: r.label })),
  { id: ADAPTIVE_ID, label: "Adaptativo" },
];

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
  const i = Math.max(
    0,
    OPTIONS.findIndex((o) => o.id === selectedId),
  );
  const step = (d: number) =>
    onSelect(OPTIONS[(i + d + OPTIONS.length) % OPTIONS.length].id);

  return (
    <div className="flex flex-col items-center gap-12">
      <div className="picker">
        <div className="picker__row">
          <button
            className="picker__chev"
            onClick={() => step(-1)}
            aria-label="Anterior"
          >
            ‹
          </button>
          <div className="picker__center">
            <div className="picker__name">{OPTIONS[i].label}</div>
            <div className="picker__desc">{DESC[OPTIONS[i].id]}</div>
          </div>
          <button
            className="picker__chev"
            onClick={() => step(1)}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
        <div className="picker__dots">
          {OPTIONS.map((o) => (
            <span
              key={o.id}
              className={`picker__dot ${o.id === selectedId ? "picker__dot--on" : ""}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-8">
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

      <button onClick={onStart} className="start" aria-label="Empezar">
        <span className="start__ring" />
        <span className="start__core" />
        <span className="start__label">Empezar</span>
      </button>
    </div>
  );
}
