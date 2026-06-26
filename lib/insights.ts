import type { State } from './types';
import { parseFact } from './engine';

export interface Insight {
  emoji: string;
  title: string;
  detail: string;
  tone: 'good' | 'neutral' | 'attention';
}

const DAY = 86400000;

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function masteredTables(state: State): number[] {
  const [min, max] = state.settings.tablesRange;
  const out: number[] = [];
  for (let t = min; t <= max; t++) {
    const rel = Object.entries(state.facts).filter(
      ([k, v]) =>
        v.introduced &&
        k.startsWith('m_') &&
        (k.startsWith(`m_${t}x`) || k.endsWith(`x${t}`)),
    );
    if (rel.length === 0) continue;
    if (avg(rel.map(([, v]) => v.mastery)) >= 0.85) out.push(t);
  }
  return out;
}

// Plain-language reading of the data, for both the panel and the email.
export function computeInsights(state: State): Insight[] {
  const insights: Insight[] = [];
  const now = Date.now();
  const introduced = Object.entries(state.facts).filter(([, v]) => v.introduced);

  if (state.sessions.length === 0) {
    insights.push({
      emoji: '🌱',
      title: 'Tot just comença',
      detail:
        'Encara no ha completat cap sessió. Quan en faci alguna, aquí veuràs com li va.',
      tone: 'neutral',
    });
    return insights;
  }

  // 1. Engagement
  const weekSessions = state.sessions.filter(s => s.startedAt > now - 7 * DAY).length;
  if (weekSessions > 0) {
    insights.push({
      emoji: '🔥',
      title: `Ha jugat ${weekSessions} ${weekSessions === 1 ? 'cop' : 'cops'} aquesta setmana`,
      detail:
        state.streak.current > 1
          ? `Porta una ratxa de ${state.streak.current} dies seguits. Constància!`
          : 'Anar fent una mica cada dia és el que més ajuda.',
      tone: 'good',
    });
  } else {
    insights.push({
      emoji: '🌤️',
      title: 'Fa dies que no juga',
      detail: 'Una sessió curta avui ajudaria a no perdre el ritme.',
      tone: 'attention',
    });
  }

  // 2. Trend
  const accs = state.sessions.map(s => s.firstTryAccuracy);
  if (accs.length >= 4) {
    const recent = avg(accs.slice(-3));
    const prev = avg(accs.slice(-6, -3));
    const d = recent - prev;
    if (d > 0.05) {
      insights.push({
        emoji: '📈',
        title: 'Està millorant',
        detail: `L'encert a la primera ha pujat del ${Math.round(prev * 100)}% al ${Math.round(recent * 100)}% en les últimes sessions.`,
        tone: 'good',
      });
    } else if (d < -0.05) {
      insights.push({
        emoji: '📉',
        title: 'Ha baixat una mica',
        detail: `Ha passat del ${Math.round(prev * 100)}% al ${Math.round(recent * 100)}%. Pot ser cansament o un grup nou de taules; res preocupant.`,
        tone: 'attention',
      });
    } else {
      insights.push({
        emoji: '➡️',
        title: 'Estable',
        detail: `Es manté al voltant del ${Math.round(recent * 100)}% d'encert a la primera.`,
        tone: 'neutral',
      });
    }
  }

  // 3. Overall level
  const mastered = introduced.filter(([, v]) => v.mastery >= 0.85).length;
  if (introduced.length > 0) {
    insights.push({
      emoji: '🌸',
      title: `Domina ${mastered} de ${introduced.length} operacions practicades`,
      detail: `És el ${Math.round((mastered / introduced.length) * 100)}% del que ha treballat fins ara.`,
      tone: mastered / introduced.length >= 0.6 ? 'good' : 'neutral',
    });
  }

  // 4. Strengths
  const strong = masteredTables(state);
  if (strong.length > 0) {
    insights.push({
      emoji: '💪',
      title: 'Punts forts',
      detail: `Té dominades del tot les taules del ${strong.join(', ')}.`,
      tone: 'good',
    });
  }

  // 5. Struggles + recommendation
  const weak = introduced
    .filter(([, v]) => v.mastery < 0.5)
    .sort((a, b) => a[1].mastery - b[1].mastery)
    .slice(0, 3)
    .map(([k]) => parseFact(k).questionText);
  if (weak.length > 0) {
    insights.push({
      emoji: '🎯',
      title: 'On posar el focus',
      detail: `El que ara li costa més: ${weak.join(', ')}. Val la pena repassar-ho aquesta setmana.`,
      tone: 'attention',
    });
  }

  // 6. Two-digit challenge
  if (state.settings.ops.multBig) {
    const big = [2, 3, 4, 5, 6, 7, 8, 9]
      .map(n => state.facts[`b_${n}`])
      .filter(s => s?.introduced);
    if (big.length > 0) {
      const m = Math.round(avg(big.map(s => s!.mastery)) * 100);
      insights.push({
        emoji: '🌳',
        title: 'Repte de dues xifres',
        detail: `Ja practica multiplicacions com 23 × 4 (domini mitjà del ${m}%).`,
        tone: m >= 60 ? 'good' : 'neutral',
      });
    } else {
      insights.push({
        emoji: '🌳',
        title: 'Repte de dues xifres',
        detail:
          'Activat però encara no començat: apareixerà quan domini més les taules (o actívalo a mà aquí sota).',
        tone: 'neutral',
      });
    }
  }

  return insights;
}

// Render the insights as a plain-text email body.
export function insightsToPlainText(state: State): string {
  const date = new Date().toLocaleDateString('ca-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const lines = computeInsights(state).map(
    i => `${i.emoji} ${i.title}\n   ${i.detail}`,
  );
  const passed = state.sessions.filter(s => s.passed).length;
  return [
    'El Jardí dels Números',
    `Com va la Valeria — ${date}`,
    '',
    ...lines,
    '',
    `Sessions totals: ${state.sessions.length} · Aprovades: ${passed}`,
    '',
    '(Resum generat des de l\'app)',
  ].join('\n');
}
