// Generates the Spanish narration with ElevenLabs and writes it to
// public/audio/voz-es.mp3. Run locally with your own key:
//
//   ELEVENLABS_API_KEY=sk_... ELEVENLABS_VOICE_ID=... npm run voice
//
// The app degrades gracefully if this asset is absent (ocean + binaural only).
// Narration text lives in scripts/narracion-es.txt and is 100% original.

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
const OUT = "public/audio/voz-es.mp3";

if (!API_KEY || !VOICE_ID) {
  console.error(
    "Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID. " +
      "Set them and re-run: npm run voice",
  );
  process.exit(1);
}

const text = await readFile("scripts/narracion-es.txt", "utf8");

const res = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
  {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      // Slow, calm, steady delivery for sleep.
      voice_settings: { stability: 0.7, similarity_boost: 0.75, speed: 0.8 },
    }),
  },
);

if (!res.ok) {
  console.error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  process.exit(1);
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, Buffer.from(await res.arrayBuffer()));
console.log(`Wrote ${OUT}`);
