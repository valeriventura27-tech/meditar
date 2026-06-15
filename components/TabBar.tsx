"use client";

// Athlytic-style floating bottom tab bar.

export type Tab = "inicio" | "tendencias" | "ajustes";

const Inicio = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="3.4" />
    <circle cx="12" cy="12" r="8" opacity="0.45" />
  </svg>
);
const Tendencias = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,15 8,10 13,13 21,4" />
    <polyline points="16,4 21,4 21,9" />
  </svg>
);
const Ajustes = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="4" y1="16" x2="20" y2="16" />
    <circle cx="9" cy="8" r="2.2" fill="#000" />
    <circle cx="15" cy="16" r="2.2" fill="#000" />
  </svg>
);

const ITEMS: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
  { id: "inicio", label: "Inicio", Icon: Inicio },
  { id: "tendencias", label: "Tendencias", Icon: Tendencias },
  { id: "ajustes", label: "Ajustes", Icon: Ajustes },
];

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="tabbar">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`tab ${tab === id ? "tab--on" : ""}`}
          onClick={() => onTab(id)}
        >
          <span className="tab__icon">
            <Icon />
          </span>
          <span className="tab__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
