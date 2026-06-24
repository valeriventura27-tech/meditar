'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearState, DEFAULT_SETTINGS, loadState, saveState } from '@/lib/storage';
import { parseFact, getOrderedFactKeys, runEngineSimulation } from '@/lib/engine';
import type { Session, Settings, State } from '@/lib/types';
import { PinInput } from '@/components/PinInput';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Mastery heatmap ───────────────────────────────────────────────────────────
function MasteryHeatmap({ state }: { state: State }) {
  const [min, max] = state.settings.tablesRange;
  const cols = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  function masteryColor(m: number, introduced: boolean): string {
    if (!introduced) return '#f1f5f9';
    const g = Math.round(50 + m * 180);
    return `rgb(30, ${g}, 60)`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-7 h-7 text-slate-400" />
            {cols.map(c => (
              <th key={c} className="w-9 h-7 text-slate-500 font-semibold">
                ×{c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map(row => (
            <tr key={row}>
              <td className="w-7 text-slate-500 font-semibold pr-1 text-right">
                {row}
              </td>
              {cols.map(col => {
                const key = `m_${row}x${col}`;
                const stat = state.facts[key];
                const bg = masteryColor(stat?.mastery ?? 0, stat?.introduced ?? false);
                const pct = stat?.introduced
                  ? `${Math.round((stat.mastery ?? 0) * 100)}%`
                  : '-';
                return (
                  <td
                    key={col}
                    title={`${row}×${col} = ${row * col}  (dom: ${pct})`}
                    className="w-9 h-9 text-center rounded"
                    style={{ backgroundColor: bg }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
        <span>Gens</span>
        <div
          className="h-3 w-24 rounded"
          style={{
            background:
              'linear-gradient(to right, rgb(30,50,60), rgb(30,230,60))',
          }}
        />
        <span>Dominada</span>
        <span className="ml-4 text-slate-300">□ = no introduïda</span>
      </div>
    </div>
  );
}

// ── Top weak facts ────────────────────────────────────────────────────────────
function TopWeakFacts({ state }: { state: State }) {
  const ordered = getOrderedFactKeys(state.settings);
  const weak = ordered
    .filter(k => state.facts[k]?.introduced && (state.facts[k]?.mastery ?? 0) < 0.7)
    .sort(
      (a, b) =>
        (state.facts[a]?.mastery ?? 0) - (state.facts[b]?.mastery ?? 0),
    )
    .slice(0, 8);

  if (weak.length === 0) {
    return (
      <p className="text-green-700 font-semibold">
        🌸 Tot dominat! Bona feina!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-slate-600 text-sm">On costa més ara mateix:</p>
      <div className="flex flex-wrap gap-2">
        {weak.map(k => {
          const f = parseFact(k);
          const m = state.facts[k]?.mastery ?? 0;
          return (
            <span
              key={k}
              className="px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-sm font-semibold text-amber-800"
            >
              {f.questionText} ({Math.round(m * 100)}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Session chart ─────────────────────────────────────────────────────────────
function SessionChart({ sessions }: { sessions: Session[] }) {
  const data = sessions.slice(-20).map((s, i) => ({
    name: `S${i + 1}`,
    accuracy: Math.round(s.firstTryAccuracy * 100),
    passed: s.passed,
  }));

  if (data.length === 0) {
    return (
      <p className="text-slate-400 text-sm">
        Encara no hi ha sessions registrades.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: number) => `${v}%`}
          labelFormatter={l => `Sessió ${l.replace('S', '')}`}
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="#166534"
          strokeWidth={2.5}
          dot={{ fill: '#166534', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Weekly summary ────────────────────────────────────────────────────────────
function WeeklySummary({ state }: { state: State }) {
  const ordered = getOrderedFactKeys(state.settings);
  const weak = ordered
    .filter(k => state.facts[k]?.introduced && (state.facts[k]?.mastery ?? 0) < 0.5)
    .sort((a, b) => (state.facts[a]?.mastery ?? 0) - (state.facts[b]?.mastery ?? 0))
    .slice(0, 3);

  const weakDesc = weak.map(k => parseFact(k).questionText).join(', ');

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-1">
      <p className="font-bold text-blue-900 text-sm">Resum setmanal</p>
      {weakDesc ? (
        <p className="text-blue-800 text-sm">
          Costa: <strong>{weakDesc}</strong>
        </p>
      ) : (
        <p className="text-blue-700 text-sm">
          Molt bé! No hi ha hechos molt dèbils ara.
        </p>
      )}
      {state.sessions.length > 0 && (
        <p className="text-blue-700 text-sm">
          Sessions totals: <strong>{state.sessions.length}</strong> ·
          Aprovades:{' '}
          <strong>{state.sessions.filter(s => s.passed).length}</strong>
        </p>
      )}
    </div>
  );
}

// ── Settings form ─────────────────────────────────────────────────────────────
function SettingsForm({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
}) {
  const [form, setForm] = useState<Settings>({ ...settings });
  const [changingPin, setChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');

  const toggle = (key: keyof Settings) => {
    setForm(prev => ({ ...prev, [key]: !prev[key as keyof Settings] }));
  };
  const handlePinFirst = (pin: string) => {
    setNewPin(pin);
    setPinStep('confirm');
  };
  const handlePinConfirm = (pin: string) => {
    if (pin === newPin) {
      setForm(prev => ({ ...prev, parentPin: pin }));
      setChangingPin(false);
      setPinStep('enter');
    } else {
      setPinStep('enter');
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-slate-800">Configuració</h3>

      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-600">
          Preguntes per sessió (ara: {form.questionsPerSession})
        </span>
        <input
          type="range"
          min={6}
          max={20}
          step={2}
          value={form.questionsPerSession}
          onChange={e =>
            setForm(prev => ({ ...prev, questionsPerSession: +e.target.value }))
          }
          className="w-full accent-green-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>6</span><span>12</span><span>20</span>
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-600">
          Llindar d&apos;aprovat: {Math.round(form.minAccuracy * 100)}%
        </span>
        <input
          type="range"
          min={50}
          max={90}
          step={5}
          value={Math.round(form.minAccuracy * 100)}
          onChange={e =>
            setForm(prev => ({ ...prev, minAccuracy: +e.target.value / 100 }))
          }
          className="w-full accent-green-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>50%</span><span>70%</span><span>90%</span>
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-600">
          Minuts del val: {form.voucherMinutes}
        </span>
        <input
          type="range"
          min={15}
          max={120}
          step={15}
          value={form.voucherMinutes}
          onChange={e =>
            setForm(prev => ({ ...prev, voucherMinutes: +e.target.value }))
          }
          className="w-full accent-green-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>15</span><span>60</span><span>120</span>
        </div>
      </label>

      {/* Toggles */}
      {(
        [
          ['softFailEnabled', 'Ronda extra si no s\'aprova (recomanat)'],
          ['soundEnabled', 'So activat'],
          ['ttsEnabled', 'Llegir les preguntes en veu alta (TTS)'],
        ] as [keyof Settings, string][]
      ).map(([key, label]) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <button
            onClick={() => toggle(key)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              form[key] ? 'bg-green-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                form[key] ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      ))}

      {/* Operations */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Operacions</p>
        <div className="flex gap-3">
          {(['mult', 'div'] as const).map(op => (
            <button
              key={op}
              onClick={() =>
                setForm(prev => ({
                  ...prev,
                  ops: { ...prev.ops, [op]: !prev.ops[op] },
                }))
              }
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                form.ops[op]
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {op === 'mult' ? '× Multiplicació' : '÷ Divisió'}
            </button>
          ))}
        </div>
      </div>

      {/* Tables range */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">
          Rang de taules: {form.tablesRange[0]}–{form.tablesRange[1]}
        </p>
        <div className="flex gap-4">
          <label className="flex-1 space-y-1">
            <span className="text-xs text-slate-500">De</span>
            <select
              value={form.tablesRange[0]}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  tablesRange: [+e.target.value, prev.tablesRange[1]],
                }))
              }
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 space-y-1">
            <span className="text-xs text-slate-500">Fins</span>
            <select
              value={form.tablesRange[1]}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  tablesRange: [prev.tablesRange[0], +e.target.value],
                }))
              }
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
            >
              {[5, 6, 7, 8, 9, 10, 12].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Change PIN */}
      {!changingPin ? (
        <button
          onClick={() => setChangingPin(true)}
          className="text-slate-500 underline text-sm"
        >
          Canviar PIN
        </button>
      ) : (
        <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
          <p className="font-semibold text-slate-700 text-sm">
            {pinStep === 'enter' ? 'Nou PIN:' : 'Confirma el nou PIN:'}
          </p>
          <PinInput
            onComplete={pinStep === 'enter' ? handlePinFirst : handlePinConfirm}
          />
          <button
            onClick={() => { setChangingPin(false); setPinStep('enter'); }}
            className="text-slate-400 underline text-sm"
          >
            Cancel·lar
          </button>
        </div>
      )}

      <button
        onClick={() => onSave(form)}
        className="w-full bg-green-600 text-white font-bold py-3.5 rounded-2xl hover:bg-green-700 transition-colors text-lg"
      >
        Desar canvis
      </button>
    </div>
  );
}

// ── Session history list ──────────────────────────────────────────────────────
function SessionHistory({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return <p className="text-slate-400 text-sm">Encara no hi ha sessions.</p>;
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {[...sessions].reverse().map(s => {
        const date = new Date(s.startedAt).toLocaleDateString('ca-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        return (
          <div
            key={s.id}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm ${
              s.passed
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div>
              <p className="font-semibold text-slate-700">{date}</p>
              <p className="text-slate-500">
                {s.correctFirstTry}/{s.total} a la primera ·{' '}
                {Math.round(s.firstTryAccuracy * 100)}%
              </p>
            </div>
            <span
              className={`font-bold text-lg ${s.passed ? 'text-green-700' : 'text-amber-700'}`}
            >
              {s.passed ? '✓' : '–'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Adults page ───────────────────────────────────────────────────────────────
export default function AdultsPage() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [simResult, setSimResult] = useState<ReturnType<typeof runEngineSimulation> | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  const handlePin = useCallback((pin: string) => {
    if (!state) return;
    if (pin === state.settings.parentPin) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  }, [state]);

  const handleSave = useCallback((newSettings: Settings) => {
    if (!state) return;
    const next = { ...state, settings: newSettings };
    saveState(next);
    setState(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [state]);

  const handleReset = useCallback(() => {
    clearState();
    router.push('/');
  }, [router]);

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-xl text-slate-500">Carregant...</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 gap-8">
        <div className="text-center space-y-2">
          <p className="text-4xl">🔒</p>
          <h1 className="text-2xl font-bold text-slate-800">
            Zona de persones adultes
          </h1>
          <p className="text-slate-500">Introduïu el PIN per continuar</p>
        </div>
        <div className="w-full max-w-xs">
          <PinInput
            onComplete={handlePin}
            errorMessage={pinError ? 'PIN incorrecte. Torna-ho a provar.' : undefined}
          />
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-slate-400 underline text-sm"
        >
          Tornar al jardí
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'stats', label: '📊 Estadístiques' },
    { id: 'settings', label: '⚙️ Ajustos' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            Zona de persones adultes
          </h1>
          <button
            onClick={() => router.push('/')}
            className="text-slate-400 text-2xl px-2"
            aria-label="Tancar"
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                activeTab === t.id
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">

            <WeeklySummary state={state} />

            {/* Session accuracy chart */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800">
                Evolució de l&apos;encert a la primera
              </h3>
              <p className="text-xs text-slate-400">
                (Últimes 20 sessions; inclou baixades)
              </p>
              <SessionChart sessions={state.sessions} />
            </div>

            {/* Mastery heatmap */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3 overflow-x-auto">
              <h3 className="font-bold text-slate-800">
                Mapa de domini — Multiplicació
              </h3>
              <MasteryHeatmap state={state} />
            </div>

            {/* Top weak facts */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800">Hechos més febles</h3>
              <TopWeakFacts state={state} />
            </div>

            {/* Session history */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800">Historial de sessions</h3>
              <SessionHistory sessions={state.sessions} />
            </div>

            {/* Engine simulation */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800">
                Test del motor adaptatiu
              </h3>
              <p className="text-xs text-slate-500">
                Simula 200 seleccions amb taula ×2 dominada (90%) i ×7 feble
                (10%). Comprova que el motor prioritza els febles.
              </p>
              <button
                onClick={() => setSimResult(runEngineSimulation())}
                className="bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-xl hover:bg-slate-200 text-sm"
              >
                Executar simulació
              </button>
              {simResult && (
                <div
                  className={`rounded-xl p-3 text-sm font-medium ${
                    simResult.passes
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {simResult.passes ? '✅ Passat!' : '⚠️ Fallit'} — ×7 (feble):{' '}
                  {simResult.weakCount} · ×2 (dominada): {simResult.strongCount}{' '}
                  · ràtio: {simResult.ratio.toFixed(1)}x
                </div>
              )}
            </div>

          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5">
            {saved && (
              <div className="bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-xl">
                ✅ Canvis desats correctament
              </div>
            )}
            <SettingsForm settings={state.settings} onSave={handleSave} />

            {/* Reset */}
            <div className="pt-4 border-t border-slate-100">
              {!resetConfirm ? (
                <button
                  onClick={() => setResetConfirm(true)}
                  className="text-red-400 underline text-sm"
                >
                  Reiniciar totes les dades
                </button>
              ) : (
                <div className="space-y-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-700 font-semibold text-sm">
                    Segur? Això esborrarà TOT el progrés de la Valeria.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl text-sm"
                    >
                      Sí, esborrar tot
                    </button>
                    <button
                      onClick={() => setResetConfirm(false)}
                      className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-sm"
                    >
                      Cancel·lar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
