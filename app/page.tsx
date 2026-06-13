"use client";

import { useRef, useState } from "react";
import { NebulaOrb } from "@/components/NebulaOrb";
import { PhaseLabel } from "@/components/PhaseLabel";
import { RhythmMenu } from "@/components/RhythmMenu";
import { useBreathingEngine } from "@/lib/useBreathingEngine";
import { RHYTHMS, makeAdaptiveRhythm, type Rhythm } from "@/lib/rhythms";
import { chooseAdaptiveStart, readOvernightHRV } from "@/lib/health/healthkit";
import { createSessionAudio, type SessionAudio } from "@/lib/audio/session-audio";

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
    rhythmLabel: string;
    hrv: number | null;
  } | null>(null);

  const audioRef = useRef<SessionAudio | null>(null);
  const totalSeconds = minutes * 60;

  const handleComplete = async () => {
    setDimmed(true);
    await audioRef.current?.fadeOutAndStop();
    const hrv = await readOvernightHRV();
    setSummary({ minutes, rhythmLabel: rhythm.label, hrv });
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
    const eyebrow =
      hour >= 21 || hour < 5
        ? "es hora de descansar"
        : hour < 12
          ? "un momento para ti"
          : "respira un momento";
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center gap-16 overflow-hidden px-8 py-16">
        <div className="ambient" />
        <p className="eyebrow rise relative z-10">{eyebrow}</p>
        <div className="rise relative z-10" style={{ animationDelay: "0.18s" }}>
          <RhythmMenu
            selectedId={selectedId}
            onSelect={setSelectedId}
            minutes={minutes}
            onMinutes={setMinutes}
            onStart={handleStart}
          />
        </div>
      </main>
    );
  }

  if (stage === "running") {
    return (
      <main
        onClick={endEarly}
        className="fade-in relative flex min-h-screen flex-col items-center justify-center"
      >
        <NebulaOrb
          scale={breathing.scale}
          phaseMs={breathing.phaseMs}
          dimmed={dimmed}
        />
        <PhaseLabel phase={dimmed ? null : breathing.phase} />
      </main>
    );
  }

  // done — soft closing summary
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center">
      <div className="ambient" />
      <div className="summary fade-in relative z-10">
        <p className="summary__hi">buenas noches</p>
        {summary && (
          <p className="summary__line">
            {summary.minutes} min · {summary.rhythmLabel}
          </p>
        )}
        <div className="summary__hrv">
          {summary?.hrv != null ? (
            <>
              <span className="summary__hrv-val">{Math.round(summary.hrv)} ms</span>
              <span className="summary__hrv-cap">tu VFC de anoche</span>
            </>
          ) : (
            <span className="summary__hrv-cap">
              conecta Salud para ver cómo esta sesión mejora tu descanso
            </span>
          )}
        </div>
        <button className="summary__dismiss" onClick={backToMenu}>
          descansa
        </button>
      </div>
    </main>
  );
}
