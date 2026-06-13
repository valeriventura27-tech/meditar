"use client";

import { useEffect, useRef, useState } from "react";
import { PlasmaOrb } from "@/components/PlasmaOrb";
import { PhaseLabel } from "@/components/PhaseLabel";
import { RhythmMenu, RHYTHM_SHORT } from "@/components/RhythmMenu";
import { Gauge } from "@/components/Gauge";
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

type Stage = "menu" | "running" | "done";

const COHERENCE = RHYTHMS[0];

export default function Home() {
  const [stage, setStage] = useState<Stage>("menu");
  const [selectedId, setSelectedId] = useState(COHERENCE.id);
  const [minutes, setMinutes] = useState(10);
  const [rhythm, setRhythm] = useState<Rhythm>(COHERENCE);
  const [dimmed, setDimmed] = useState(false);
  const [summary, setSummary] = useState<{
    minutes: number;
    rhythmId: string;
    hrv: number | null;
  } | null>(null);

  const [homeHrv, setHomeHrv] = useState<number | null>(null);

  const audioRef = useRef<SessionAudio | null>(null);
  const totalSeconds = minutes * 60;

  // Last night's HRV for the recovery card (null on web / if denied).
  useEffect(() => {
    readOvernightHRV().then(setHomeHrv);
  }, []);

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
    setStage("menu");
  };

  if (stage === "menu") {
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

    return (
      <main className="home fade-in">
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

        <section className="card hrv">
          <span className="card__title">Recuperación</span>
          {homeHrv != null ? (
            <div className="hrv__val">
              <span className="hrv__num">{Math.round(homeHrv)}</span>
              <span className="hrv__unit">ms · VFC anoche</span>
            </div>
          ) : (
            <p className="hrv__connect">
              Conecta Salud para ver cómo cada sesión mejora tu descanso.
            </p>
          )}
        </section>

        <button className="cta" onClick={handleStart}>
          Empezar
        </button>
      </main>
    );
  }

  if (stage === "running") {
    return (
      <main
        onClick={endEarly}
        className="fade-in relative flex min-h-screen flex-col items-center justify-center"
      >
        <PlasmaOrb
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
