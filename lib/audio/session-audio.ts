// Mixes the three session layers and handles the auto-fade at the end.
//
//   binaural  -> only raised when stereo headphones are detected
//   ocean     -> always present, plays through the speaker
//   voice     -> ElevenLabs Spanish narration (an mp3 placed in /audio)
//
// Volume balance (brief): binaural sits below voice and ocean.

import { createBinaural, type Binaural } from "./binaural";
import { createOcean, type Ocean } from "./ocean";
import { detectHeadphones } from "./headphones";
import type { PhaseName } from "../rhythms";

const VOICE_SRC = "/audio/voz-es.mp3";

const VOL = {
  binaural: 0.04,
  ocean: 0.18,
  voice: 0.5,
};

const FADE_SECONDS = 20;

export type SessionAudio = {
  start: (totalSeconds: number, binauralOn?: boolean) => Promise<void>;
  breathe: (phase: PhaseName, seconds: number) => void;
  fadeOutAndStop: () => Promise<void>;
};

export function createSessionAudio(): SessionAudio {
  const ctx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)();

  const binaural: Binaural = createBinaural(ctx);
  const ocean: Ocean = createOcean(ctx);

  const voice = new Audio(VOICE_SRC);
  voice.preload = "auto";
  voice.volume = VOL.voice;

  // iOS only unlocks audio inside the user gesture. createSessionAudio() is
  // called synchronously from the "Comenzar" tap, so resume here — before any
  // awaits in the caller can drop the gesture.
  void ctx.resume();

  let stopped = false;

  return {
    async start(totalSeconds: number, binauralOn = true) {
      await ctx.resume();

      ocean.setVolume(VOL.ocean, 3);

      const hasHeadphones = await detectHeadphones();
      binaural.start(totalSeconds);
      // Binaural needs stereo headphones and the user's setting enabled.
      binaural.setVolume(binauralOn && hasHeadphones ? VOL.binaural : 0, 3);

      // Voice may be absent (no asset generated yet) — degrade silently.
      voice.play().catch(() => {
        /* no narration available */
      });
    },

    breathe(phase: PhaseName, seconds: number) {
      if (stopped) return;
      ocean.breathe(phase, seconds);
    },

    async fadeOutAndStop() {
      if (stopped) return;
      stopped = true;

      ocean.setVolume(0, FADE_SECONDS);
      binaural.setVolume(0, FADE_SECONDS);

      // Fade the voice element manually (HTMLAudioElement has no ramp).
      const steps = 40;
      const startVol = voice.volume;
      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, (FADE_SECONDS * 1000) / steps));
        voice.volume = Math.max(0, startVol * (1 - i / steps));
      }

      voice.pause();
      ocean.stop();
      binaural.stop();
      await ctx.close().catch(() => {});
    },
  };
}
