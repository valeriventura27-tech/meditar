'use client';
import type { FactStat } from '@/lib/types';

function plantEmoji(mastery: number, introduced: boolean): string {
  if (!introduced) return '🪨';
  if (mastery < 0.25) return '🌱';
  if (mastery < 0.55) return '🪴';
  if (mastery < 0.85) return '🌷';
  return '🌸';
}

function tableMastery(
  table: number,
  facts: Record<string, FactStat>,
): { mastery: number; introduced: boolean } {
  const related = Object.entries(facts).filter(
    ([k]) =>
      k.startsWith('m_') &&
      (k.startsWith(`m_${table}x`) || k.endsWith(`x${table}`)),
  );
  if (related.length === 0) return { mastery: 0, introduced: false };
  const introduced = related.some(([, v]) => v.introduced);
  if (!introduced) return { mastery: 0, introduced: false };
  const mean = related.reduce((s, [, v]) => s + v.mastery, 0) / related.length;
  return { mastery: mean, introduced };
}

interface Props {
  facts: Record<string, FactStat>;
  tablesRange: [number, number];
}

export function Garden({ facts, tablesRange }: Props) {
  const [min, max] = tablesRange;
  const tables = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Two-digit × one-digit challenge skills, shown once any are introduced
  const bigSkills = [2, 3, 4, 5, 6, 7, 8, 9]
    .map(n => ({ n, stat: facts[`b_${n}`] }))
    .filter(s => s.stat?.introduced);

  return (
    <div className="rounded-3xl bg-green-50 border-2 border-green-100 p-5 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-green-800 mb-4 text-center">
          El teu jardí 🌿
        </h2>
        <div className="grid grid-cols-5 gap-4">
          {tables.map(t => {
            const { mastery, introduced } = tableMastery(t, facts);
            const emoji = plantEmoji(mastery, introduced);
            const mastered = mastery >= 0.85;
            return (
              <div key={t} className="flex flex-col items-center gap-1">
                <span className="text-4xl leading-none">{emoji}</span>
                {mastered ? (
                  <span className="text-xs font-bold text-green-600">Dominada!</span>
                ) : (
                  <span className="text-sm font-semibold text-slate-500">×{t}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {bigSkills.length > 0 && (
        <div className="border-t-2 border-green-100 pt-4">
          <h3 className="text-lg font-bold text-green-800 mb-3 text-center">
            Repte: dues xifres 🌳
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {bigSkills.map(({ n, stat }) => {
              const m = stat?.mastery ?? 0;
              const emoji = plantEmoji(m, true);
              const mastered = m >= 0.85;
              return (
                <div key={n} className="flex flex-col items-center gap-1">
                  <span className="text-4xl leading-none">{emoji}</span>
                  {mastered ? (
                    <span className="text-xs font-bold text-green-600">Dominat!</span>
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">··×{n}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
