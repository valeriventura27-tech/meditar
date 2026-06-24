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

  return (
    <div className="rounded-3xl bg-green-50 border-2 border-green-100 p-5">
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
  );
}
