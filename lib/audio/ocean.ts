// Ocean-wave layer, synthesized (no audio file). Brown noise shaped by a slow
// low-pass sweep and a slow amplitude swell, which reads as rolling surf.

export type Ocean = {
  setVolume: (gain: number, rampSeconds?: number) => void;
  stop: () => void;
};

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
  filter.frequency.value = 600;

  // Slow swell: an LFO opens and closes the filter to mimic waves.
  const sweep = ctx.createOscillator();
  sweep.frequency.value = 0.08; // ~12s per wave
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.value = 400;
  sweep.connect(sweepDepth).connect(filter.frequency);

  const gain = ctx.createGain();
  gain.gain.value = 0;

  noise.connect(filter).connect(gain).connect(ctx.destination);

  noise.start();
  sweep.start();

  return {
    setVolume(g: number, rampSeconds = 1) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(g, now + rampSeconds);
    },
    stop() {
      try {
        noise.stop();
        sweep.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
