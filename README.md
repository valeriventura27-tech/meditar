# meditar (nombre TBD)

Entrenador de biofeedback cardíaco para dormir, disfrazado de un punto rojo
cálido que respira. Fase 1 (MVP): todo en cliente, sin backend ni cuentas.

## Principios de diseño

- Negro absoluto (`#000`), ideal OLED. Cero azul, incluido el texto (gris cálido).
- Uso nocturno a ciegas: pocos botones, la interfaz desaparece.
- Sin fricción: abrir → un toque → suena y se atenúa sola.

## Stack

- Next.js (App Router, export estático) + Tailwind + TypeScript.
- Capacitor (iOS) desde el día uno: háptica nativa y audio en segundo plano.
- Audio binaural y olas generados con la Web Audio API (sin archivos de tono).
- Voz narrada en español con ElevenLabs (un mp3 en `/public/audio`).
- HealthKit (solo lectura) para el arranque adaptativo por HRV.

## Desarrollo web

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # genera ./out (export estático)
```

Verás el menú (3 ritmos fijos + adaptativo, y duración), el punto que respira,
las olas + binaural, el temporizador y el atenuado automático al terminar.
En el navegador, la háptica y HealthKit se degradan (no hay device): el
adaptativo cae a Coherencia 5,5.

## Ritmos

- **Coherencia 5,5/min** (por defecto): 5,45 s inhala · 5,45 s exhala.
- **4 · 7 · 8**: inhala 4 · mantén 7 · exhala 8.
- **Caja**: 4 · 4 · 4 · 4.
- **Adaptativo (HRV)** — Capa 1: lee el HRV de la noche anterior; si está por
  debajo de tu línea base arranca ~6,5/min y baja a 5,5/min en los primeros
  minutos; si no, arranca en 5,5/min.

## Voz (ElevenLabs)

El texto original está en `scripts/narracion-es.txt`. Genera el audio con tu key:

```bash
ELEVENLABS_API_KEY=sk_... ELEVENLABS_VOICE_ID=... npm run voice
```

Escribe `public/audio/voz-es.mp3` (ignorado por git). Si no existe, la sesión
suena solo con olas + binaural.

## iOS (Capacitor) — requiere un Mac con Xcode

```bash
npm run build              # genera ./out
npx cap add ios            # crea el proyecto nativo (una vez)
npx cap sync               # copia los assets
npx cap open ios           # abre Xcode
```

En Xcode hay que configurar a mano (no se versionan los proyectos nativos):

1. **Audio en segundo plano**: Signing & Capabilities → Background Modes →
   *Audio, AirPlay, and Picture in Picture*. Sin esto el audio se corta con la
   pantalla bloqueada.
2. **HealthKit**: añade la capability HealthKit y los usos de privacidad
   (`NSHealthShareUsageDescription`). Solo lectura de HRV (SDNN), RHR y sueño.
3. **Plugin de HealthKit**: registra un plugin nativo expuesto como `HealthKit`
   con `requestAuthorization` y `queryHRV` (ver `lib/health/healthkit.ts`).
   Si el permiso se deniega, el modo adaptativo degrada a ritmos fijos.
4. **Háptica**: `@capacitor/haptics` ya está instalado; en device la vibración
   por fase va por nativo (iOS no soporta la Vibration API web).

Prueba personal en iPhone con Apple ID gratuito (no requiere los 99 €/año).

## Restricciones conocidas

- El binaural solo se oye con auriculares estéreo; sin ellos se anula (inofensivo).
- La detección de cascos en web es best-effort; en iOS conviene un chequeo nativo.
- El brillo bajo por defecto es del sistema; la app ya parte de negro y acentos
  tenues.

## Validación (n=1)

Compara noches con app vs. sin app durante ~2 semanas (HRV nocturno, RHR,
latencia de sueño, sueño profundo) vía HealthKit / AutoSleep.

---

Este repo sigue las guías de [`CLAUDE.md`](./CLAUDE.md)
(andrej-karpathy-skills): pensar antes de codificar, simplicidad, cambios
quirúrgicos y ejecución orientada a objetivos.
