'use client';

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

function tone(freq: number, endFreq: number, duration: number, vol = 0.25) {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + duration);
  gain.gain.setValueAtTime(vol, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

export function playSuccess() {
  tone(523, 784, 0.35); // C5 → G5
}

export function playGenial() {
  tone(659, 988, 0.4); // E5 → B5
}

export function playTryAgain() {
  tone(392, 349, 0.25, 0.15); // G4 → F4, gentle
}

export function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ca-ES';
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
