"use client";

import { useRef, useState } from "react";
import { NebulaOrb } from "@/components/NebulaOrb";
import { PhaseLabel } from "@/components/PhaseLabel";
import { RhythmMenu } from "@/components/RhythmMenu";
import { useBreathingEngine } from "@/lib/useBreathingEngine";
import { RHYTHMS, makeAdaptiveRhythm, type Rhythm } from "@/lib/rhythms";
import { chooseAdaptiveStart } from "@/lib/health/healthkit";
import { createSessionAudio, type SessionAudio } from "@/lib/audio/session-audio";

type Stage = "menu" | "running" | "done";

const COHERENCE = RHYTHMS[0];

export default function Home() {
  const [stage, setStage] = useState<Stage>("menu");
  const [selectedId, setSelectedId] = useState(COHERENCE.id);
  const [minutes, setMinutes] = useState(10);
  const [rhythm, setRhythm] = useState<Rhythm>(COHERENCE);
  const [dimmed, setDimmed] = useState(false);

  const audioRef = useRef<SessionAudio | null>(null);
  const totalSeconds = minutes * 60;

  const handleComplete = async () => {
    setDimmed(true);
    await audioRef.current?.fadeOutAndStop();
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

  if (stage === "menu") {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center gap-14 px-8 py-16">
        <div className="ambient" />
        <header className="rise relative flex flex-col items-center text-center">
          <h1 className="wordmark">respira</h1>
          <p className="wordmark__sub">respira con la luz</p>
        </header>
        <div className="relative">
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

  return (
    <main
      onClick={endEarly}
      className="relative flex min-h-screen flex-col items-center justify-center"
    >
      {stage === "running" ? (
        <div className="fade-in flex flex-col items-center">
          <NebulaOrb
            scale={breathing.scale}
            phaseMs={breathing.phaseMs}
            dimmed={dimmed}
          />
          <PhaseLabel phase={dimmed ? null : breathing.phase} />
        </div>
      ) : (
        <p
          className="font-serif fade-in text-3xl"
          style={{ color: "#9a8474", letterSpacing: "0.04em" }}
          onClick={() => setStage("menu")}
        >
          buenas noches
        </p>
      )}
    </main>
  );
}
