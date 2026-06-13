// Best-effort stereo-headphone detection.
//
// The web has no reliable headphone API, so in the browser we make a best
// guess from the available audio outputs. On iOS (Capacitor) this should be
// replaced by a native route check; until then the binaural layer is harmless
// without headphones because it self-cancels.

export async function detectHeadphones(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return false;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((d) => d.kind === "audiooutput");
    // Labels are only populated after a media-permission grant; when present,
    // look for headphone-like outputs.
    const labelled = outputs.filter((d) => d.label);
    if (labelled.length === 0) return false;
    return labelled.some((d) => /headphone|headset|airpod|bluetooth|wired/i.test(d.label));
  } catch {
    return false;
  }
}
