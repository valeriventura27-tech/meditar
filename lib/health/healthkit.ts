// HealthKit read access for the adaptive (Layer 1) start.
//
// Reads last night's HRV (SDNN) and compares it against the user's rolling
// baseline to decide whether the adaptive rhythm should start slower.
//
// Web/dev has no HealthKit, and on device the permission can be denied — in
// both cases we return null and the caller degrades to the fixed rhythms.

const BASELINE_KEY = "meditar.hrv.baseline";

type HealthPlugin = {
  requestAuthorization?: (opts: unknown) => Promise<unknown>;
  queryHRV?: () => Promise<{ sdnn: number } | null>;
};

async function getHealthPlugin(): Promise<HealthPlugin | null> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    // The concrete HealthKit plugin is registered in the native iOS project.
    // We look it up by name so the web build never tries to bundle it.
    const plugin = (Capacitor as unknown as {
      Plugins?: Record<string, HealthPlugin>;
    }).Plugins?.["HealthKit"];
    return plugin ?? null;
  } catch {
    return null;
  }
}

// Returns last night's SDNN in ms, or null if unavailable / denied.
export async function readOvernightHRV(): Promise<number | null> {
  const plugin = await getHealthPlugin();
  if (!plugin?.queryHRV) return null;
  try {
    await plugin.requestAuthorization?.({ read: ["HRV", "RHR", "sleep"] });
    const result = await plugin.queryHRV();
    return result?.sdnn ?? null;
  } catch {
    return null;
  }
}

function readBaseline(): number | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(BASELINE_KEY);
  return raw ? Number(raw) : null;
}

function updateBaseline(sdnn: number): void {
  if (typeof localStorage === "undefined") return;
  const prev = readBaseline();
  // Simple exponential moving average as the personal baseline.
  const next = prev == null ? sdnn : prev * 0.8 + sdnn * 0.2;
  localStorage.setItem(BASELINE_KEY, String(next));
}

export type AdaptiveStart = {
  available: boolean;
  startBelowBaseline: boolean;
};

// Decides the adaptive start. If HRV is unavailable, `available` is false and
// the caller should fall back to a fixed rhythm.
export async function chooseAdaptiveStart(): Promise<AdaptiveStart> {
  const sdnn = await readOvernightHRV();
  if (sdnn == null) {
    return { available: false, startBelowBaseline: false };
  }
  const baseline = readBaseline();
  const below = baseline != null && sdnn < baseline;
  updateBaseline(sdnn);
  return { available: true, startBelowBaseline: below };
}
