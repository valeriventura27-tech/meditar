// Binaural beat generator (Web Audio API). Two oscillators, one hard-panned to
// each ear, with a small frequency difference equal to the target beat.
//
// Only audible as a "beat" with stereo headphones; harmless without them (it
// cancels). The beat starts in theta (~6 Hz) and drifts toward delta (~2 Hz)
// across the session to follow the descent into sleep.

const CARRIER_HZ = 200; // low, warm carrier
const BEAT_START_HZ = 6; // theta
const BEAT_END_HZ = 2; // delta

export type Binaural = {
  start: (driftSeconds: number) => void;
  setVolume: (gain: number, rampSeconds?: number) => void;
  stop: () => void;
};

export function createBinaural(ctx: AudioContext): Binaural {
  const left = ctx.createOscillator();
  const right = ctx.createOscillator();
  left.type = "sine";
  right.type = "sine";

  const panL = ctx.createStereoPanner();
  const panR = ctx.createStereoPanner();
  panL.pan.value = -1;
  panR.pan.value = 1;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  left.connect(panL).connect(gain);
  right.connect(panR).connect(gain);
  gain.connect(ctx.destination);

  let started = false;

  return {
    start(driftSeconds: number) {
      if (started) return;
      started = true;
      const now = ctx.currentTime;
      left.frequency.setValueAtTime(CARRIER_HZ, now);
      // Right ear carries the beat offset, drifting theta -> delta.
      right.frequency.setValueAtTime(CARRIER_HZ + BEAT_START_HZ, now);
      right.frequency.linearRampToValueAtTime(
        CARRIER_HZ + BEAT_END_HZ,
        now + driftSeconds,
      );
      left.start(now);
      right.start(now);
    },
    setVolume(g: number, rampSeconds = 1) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(g, now + rampSeconds);
    },
    stop() {
      try {
        left.stop();
        right.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
