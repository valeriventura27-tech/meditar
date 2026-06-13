// Haptic feedback on every breathing phase change.
//
// iOS does NOT support the web Vibration API, so on device we go through the
// native Capacitor Haptics plugin. In the browser (dev/preview) we fall back to
// navigator.vibrate when available, and otherwise do nothing.

import type { PhaseName } from "./rhythms";

let nativeHaptics: typeof import("@capacitor/haptics") | null = null;
let nativeChecked = false;

async function getNativeHaptics() {
  if (nativeChecked) return nativeHaptics;
  nativeChecked = true;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      nativeHaptics = await import("@capacitor/haptics");
    }
  } catch {
    nativeHaptics = null;
  }
  return nativeHaptics;
}

export async function pulseForPhase(phase: PhaseName): Promise<void> {
  const native = await getNativeHaptics();
  if (native) {
    const { Haptics, ImpactStyle } = native;
    // Soft pulse on inhale/exhale; lighter tick on hold transitions.
    const style =
      phase === "exhala"
        ? ImpactStyle.Light
        : phase === "inhala"
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
    try {
      await Haptics.impact({ style });
    } catch {
      /* ignore */
    }
    return;
  }

  // Web fallback (works on Android web, no-op on iOS Safari).
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const ms = phase === "inhala" ? 40 : phase === "exhala" ? 30 : 15;
    navigator.vibrate(ms);
  }
}
