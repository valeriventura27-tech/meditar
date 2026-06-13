// Ocean-wave layer, synthesized (no audio file). Brown noise shaped by a
// low-pass filter. The swell is driven by the breath: on inhale the surf rises
// (louder, brighter); on exhale it recedes — in sync with the dot.

import type { PhaseName } from "../rhythms";

export type Ocean = {
  setVolume: (gain: number, rampSeconds?: number) => void;
  breathe: (phase: PhaseName, seconds: number) => void;
  stop: () => void;
};

// Surf swells toward PEAK on inhale and recedes toward TROUGH on exhale.
const TROUGH = 0.1;
const PEAK = 0.24;
const FILT_LOW = 380; // receded, muffled
const FILT_HIGH = 900; // risen, present

function createBrownNoise(ctx: AudioContext): AudioBufferSourceNode {
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5; // compensate for the gain lost in the integrator
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

export function createOcean(ctx: AudioContext): Ocean {
  const noise = createBrownNoise(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = FILT_LOW;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();

  return {
    setVolume(g: number, rampSeconds = 1) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(g, now + rampSeconds);
    },
    breathe(phase: PhaseName, seconds: number) {
      if (phase === "manten") return; // hold the current swell
      const now = ctx.currentTime;
      const g = phase === "inhala" ? PEAK : TROUGH;
      const f = phase === "inhala" ? FILT_HIGH : FILT_LOW;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(g, now + seconds);
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(f, now + seconds);
    },
    stop() {
      try {
        noise.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
