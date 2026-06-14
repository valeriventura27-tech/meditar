"use client";

import { useEffect, useRef, useState } from "react";
import { BreathingFlower } from "@/components/BreathingFlower";
import { BreathingDot } from "@/components/BreathingDot";
import { PhaseLabel } from "@/components/PhaseLabel";
import { RhythmMenu, RHYTHM_SHORT } from "@/components/RhythmMenu";
import { Gauge } from "@/components/Gauge";
import { TabBar, type Tab } from "@/components/TabBar";
import { HrvChart } from "@/components/HrvChart";
import { useBreathingEngine } from "@/lib/useBreathingEngine";
import { RHYTHMS, makeAdaptiveRhythm, type Rhythm } from "@/lib/rhythms";
import { chooseAdaptiveStart, readOvernightHRV } from "@/lib/health/healthkit";
import { createSessionAudio, type SessionAudio } from "@/lib/audio/session-audio";

const DESC: Record<string, string> = {
  coherencia: "el equilibrio",
  "478": "para soltar el día",
  caja: "calma estable",
  adaptativo: "se ajusta a tu HRV",
};

type Stage = "home" | "running" | "done";
type Visual = "flor" | "punto";

const COHERENCE = RHYTHMS[0];

// Sample HRV history for the Trends tab (until HealthKit is connected).
const HRV_SERIES = [46, 43, 49, 51, 47, 54, 50, 57, 53, 59, 56, 61, 58, 63];

export default function Home() {
  const [stage, setStage] = useState<Stage>("home");
  const [tab, setTab] = useState<Tab>("inicio");
  const [selectedId, setSelectedId] = useState(COHERENCE.id);
  const [minutes, setMinutes] = useState(10);
  const [rhythm, setRhythm] = useState<Rhythm>(COHERENCE);
  const [visual, setVisual] = useState<Visual>("flor");
  const [dimmed, setDimmed] = useState(false);
  const [summary, setSummary] = useState<{
    minutes: number;
    rhythmId: string;
    hrv: number | null;
  } | null>(null);

  const audioRef = useRef<SessionAudio | null>(null);
  const totalSeconds = minutes * 60;

  // Persisted visual choice (flower vs dot).
  useEffect(() => {
    const v = localStorage.getItem("meditar.visual");
    if (v === "flor" || v === "punto") setVisual(v);
  }, []);
  const chooseVisual = (v: Visual) => {
    setVisual(v);
    localStorage.setItem("meditar.visual", v);
  };

  const handleComplete = async () => {
    setDimmed(true);
    await audioRef.current?.fadeOutAndStop();
    const hrv = await readOvernightHRV();
    setSummary({ minutes, rhythmId: rhythm.id, hrv });
    setStage("done");
  };

  const breathing = useBreathingEngine(
    rhythm,
    totalSeconds,
    stage === "running",
    handleComplete,
    (phase, seconds) => audioRef.current?.breathe(phase, seconds),
  );

  const resolveRhythm = async (): Promise<Rhythm> => {
    if (selectedId !== "adaptativo") {
      return RHYTHMS.find((r) => r.id === selectedId) ?? COHERENCE;
    }
    // Adaptive (Layer 1): read overnight HRV; degrade to coherence if denied.
    const start = await chooseAdaptiveStart();
    return start.available
      ? makeAdaptiveRhythm(start.startBelowBaseline)
      : COHERENCE;
  };

  const handleStart = async () => {
    // Create + unlock audio synchronously within the tap (iOS), before the
    // HRV read can break the user gesture.
    const audio = createSessionAudio();
    audioRef.current = audio;
    const chosen = await resolveRhythm();
    setRhythm(chosen);
    await audio.start(totalSeconds);
    setDimmed(false);
    setStage("running");
  };

  const endEarly = () => {
    if (stage === "running") handleComplete();
  };

  const backToMenu = () => {
    setSummary(null);
    setDimmed(false);
    setTab("inicio");
    setStage("home");
  };

  if (stage === "home") {
    const hour = new Date().getHours();
    const greeting =
      hour >= 21 || hour < 5
        ? "Buenas noches"
        : hour < 12
          ? "Buenos días"
          : "Buenas tardes";
    const dateLabel = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const cur = HRV_SERIES[HRV_SERIES.length - 1];
    const base = HRV_SERIES.reduce((a, b) => a + b, 0) / HRV_SERIES.length;
    const recovery = Math.min(100, Math.round((cur / base) * 72));
    const stress = Math.max(5, Math.min(95, Math.round(100 - (cur - 38) * 2.4)));
    const stressLabel = stress < 35 ? "Bajo" : stress < 65 ? "Medio" : "Alto";

    const VISUALS: { id: Visual; name: string; desc: string }[] = [
      { id: "flor", name: "Flor de la vida", desc: "geometría viva que florece" },
      { id: "punto", name: "Punto", desc: "una luz que respira" },
    ];

    return (
      <main className="home dash fade-in">
        {tab === "inicio" && (
          <>
            <header className="home__head">
              <h1 className="home__hi">{greeting}</h1>
              <p className="home__date">{dateLabel}</p>
            </header>

            <section className="card hero">
              <Gauge fill={minutes / 30}>
                <div className="hero__c">
                  <span className="hero__rhythm">{RHYTHM_SHORT[selectedId]}</span>
                  <span className="hero__num">
                    {minutes}
                    <i className="hero__unit">min</i>
                  </span>
                  <span className="hero__hint">{DESC[selectedId]}</span>
                </div>
              </Gauge>
              <div className="dur">
                {[5, 10, 30].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={`dur__pill ${minutes === m ? "dur__pill--on" : ""}`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </section>

            <RhythmMenu selectedId={selectedId} onSelect={setSelectedId} />

            <button className="cta" onClick={handleStart}>
              Empezar
            </button>
          </>
        )}

        {tab === "tendencias" && (
          <>
            <header className="home__head">
              <h1 className="home__hi">Tendencias</h1>
              <p className="home__date">Tu recuperación</p>
            </header>

            <section className="card">
              <span className="card__title">Recuperación</span>
              <div className="stat">
                <span className="stat__num">
                  {recovery}
                  <i className="stat__unit">%</i>
                </span>
                <span className="stat__label">Listo para descansar</span>
              </div>
              <div className="bar">
                <div className="bar__fill" style={{ width: `${recovery}%` }} />
              </div>
            </section>

            <section className="card">
              <div className="card__row">
                <span className="card__title">Variabilidad · VFC</span>
                <span className="card__big">{cur} ms</span>
              </div>
              <HrvChart data={HRV_SERIES} />
              <p className="caption">Últimas 14 noches · datos de ejemplo</p>
            </section>

            <section className="card">
              <span className="card__title">Estrés</span>
              <div className="stat">
                <span className="stat__num stat__num--stress">{stress}</span>
                <span className="stat__label">{stressLabel}</span>
              </div>
              <div className="bar">
                <div
                  className="bar__fill bar__fill--stress"
                  style={{ width: `${stress}%` }}
                />
              </div>
            </section>

            <section className="card">
              <div className="metrics">
                <div className="metric">
                  <span className="metric__v">{Math.round(base)}</span>
                  <span className="metric__k">VFC base</span>
                </div>
                <div className="metric">
                  <span className="metric__v">58</span>
                  <span className="metric__k">FC reposo</span>
                </div>
                <div className="metric">
                  <span className="metric__v">7,4 h</span>
                  <span className="metric__k">Sueño</span>
                </div>
              </div>
            </section>
          </>
        )}

        {tab === "ajustes" && (
          <>
            <header className="home__head">
              <h1 className="home__hi">Ajustes</h1>
              <p className="home__date">Personaliza tu sesión</p>
            </header>
            <section className="card">
              <span className="card__title">Visual de la sesión</span>
              <div className="opts">
                {VISUALS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => chooseVisual(v.id)}
                    className={`opt ${visual === v.id ? "opt--on" : ""}`}
                  >
                    <span className="opt__name">{v.name}</span>
                    <span className="opt__desc">{v.desc}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <TabBar tab={tab} onTab={setTab} />
      </main>
    );
  }

  if (stage === "running") {
    const Visualizer = visual === "flor" ? BreathingFlower : BreathingDot;
    return (
      <main
        onClick={endEarly}
        className="fade-in relative flex min-h-screen flex-col items-center justify-center"
      >
        <Visualizer
          scale={breathing.scale}
          phaseMs={breathing.phaseMs}
          dimmed={dimmed}
        />
        <PhaseLabel phase={dimmed ? null : breathing.phase} />
      </main>
    );
  }

  // done — closing summary dashboard, same language as the home
  return (
    <main className="home fade-in">
      <header className="home__head">
        <h1 className="home__hi">Buenas noches</h1>
        <p className="home__date">Sesión completada</p>
      </header>

      <section className="card hero">
        <Gauge fill={1}>
          <div className="hero__c">
            <span className="hero__rhythm">
              {summary ? RHYTHM_SHORT[summary.rhythmId] : ""}
            </span>
            <span className="hero__num">
              {summary?.minutes}
              <i className="hero__unit">min</i>
            </span>
            <span className="hero__hint">completado</span>
          </div>
        </Gauge>
      </section>

      <section className="card hrv">
        <span className="card__title">Recuperación</span>
        {summary?.hrv != null ? (
          <div className="hrv__val">
            <span className="hrv__num">{Math.round(summary.hrv)}</span>
            <span className="hrv__unit">ms · VFC anoche</span>
          </div>
        ) : (
          <p className="hrv__connect">
            Conecta Salud para ver cómo esta sesión mejora tu descanso.
          </p>
        )}
      </section>

      <button className="cta" onClick={backToMenu}>
        Descansa
      </button>
    </main>
  );
}
