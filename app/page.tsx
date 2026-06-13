"use client";

import { useRef, useState } from "react";
import { BreathingDot } from "@/components/BreathingDot";
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
    const chosen = await resolveRhythm();
    setRhythm(chosen);
    audioRef.current = createSessionAudio();
    await audioRef.current.start(totalSeconds);
    setDimmed(false);
    setStage("running");
  };

  const endEarly = () => {
    if (stage === "running") handleComplete();
  };

  if (stage === "menu") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-12">
        <h1
          className="text-2xl tracking-[0.4em]"
          style={{ color: "#8a7d72" }}
        >
          respira
        </h1>
        <RhythmMenu
          selectedId={selectedId}
          onSelect={setSelectedId}
          minutes={minutes}
          onMinutes={setMinutes}
          onStart={handleStart}
        />
      </main>
    );
  }

  return (
    <main
      onClick={endEarly}
      className="flex min-h-screen flex-col items-center justify-center"
    >
      {stage === "running" ? (
        <>
          <BreathingDot
            scale={breathing.scale}
            phaseMs={breathing.phaseMs}
            dimmed={dimmed}
          />
          <PhaseLabel phase={dimmed ? null : breathing.phase} />
        </>
      ) : (
        <p
          className="text-base tracking-[0.4em]"
          style={{ color: "#5c5248" }}
          onClick={() => setStage("menu")}
        >
          buenas noches
        </p>
      )}
    </main>
  );
}
