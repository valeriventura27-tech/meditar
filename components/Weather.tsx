"use client";

import { useEffect, useState } from "react";

// Today's temperature from the device location (free open-meteo API, no key).
// Runs in the user's browser, so it works on the phone even when the dev
// sandbox has no network.

type State = {
  status: "loading" | "ok" | "error";
  temp?: number;
  max?: number;
  min?: number;
  desc?: string;
};

const CODES: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla",
  51: "Llovizna",
  53: "Llovizna",
  55: "Llovizna",
  61: "Lluvia",
  63: "Lluvia",
  65: "Lluvia fuerte",
  71: "Nieve",
  73: "Nieve",
  75: "Nieve",
  80: "Chubascos",
  81: "Chubascos",
  82: "Chubascos fuertes",
  95: "Tormenta",
  96: "Tormenta",
  99: "Tormenta",
};

export function Weather() {
  const [w, setW] = useState<State>({ status: "loading" });

  const load = () => {
    setW({ status: "loading" });
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setW({ status: "error" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
            `&longitude=${longitude}&current=temperature_2m,weather_code` +
            `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
          const r = await fetch(url);
          const d = await r.json();
          setW({
            status: "ok",
            temp: Math.round(d.current.temperature_2m),
            desc: CODES[d.current.weather_code] ?? "",
            max: Math.round(d.daily.temperature_2m_max[0]),
            min: Math.round(d.daily.temperature_2m_min[0]),
          });
        } catch {
          setW({ status: "error" });
        }
      },
      () => setW({ status: "error" }),
      { timeout: 8000, maximumAge: 600000 },
    );
  };

  useEffect(load, []);

  return (
    <>
      <header className="home__head">
        <h1 className="home__hi">Clima</h1>
        <p className="home__date">Tu entorno de descanso hoy</p>
      </header>

      <section className="card weather">
        {w.status === "loading" && (
          <p className="weather__msg">Cargando temperatura…</p>
        )}

        {w.status === "error" && (
          <div className="weather__err">
            <p className="weather__msg">
              Activa la ubicación para ver la temperatura de hoy.
            </p>
            <button className="cta" onClick={load}>
              Reintentar
            </button>
          </div>
        )}

        {w.status === "ok" && (
          <>
            <div className="weather__now">
              <span className="weather__temp">{w.temp}°</span>
              <span className="weather__desc">{w.desc}</span>
            </div>
            <div className="metrics">
              <div className="metric">
                <span className="metric__v">{w.max}°</span>
                <span className="metric__k">Máx</span>
              </div>
              <div className="metric">
                <span className="metric__v">{w.min}°</span>
                <span className="metric__k">Mín</span>
              </div>
            </div>
          </>
        )}
      </section>

      {w.status === "ok" && (
        <section className="card">
          <span className="card__title">Para dormir</span>
          <p className="weather__tip">
            {w.min != null && w.min >= 19
              ? "Tu noche viene cálida. Una habitación a 16–19 °C favorece el sueño profundo: ventila antes de acostarte."
              : "Temperatura ideal para descansar. Mantén el cuarto entre 16–19 °C para un sueño profundo."}
          </p>
        </section>
      )}
    </>
  );
}
