import type { Settings, FactStat, FactResult, ParsedFact } from './types';

// ── Fact key parsing ──────────────────────────────────────────────────────────

export function parseFact(key: string): ParsedFact {
  if (key.startsWith('m_') || key.startsWith('mb_')) {
    // m_AxB (table) and mb_AAxB (two-digit × one-digit) share the same shape
    const parts = key.slice(key.indexOf('_') + 1).split('x');
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    return { op: 'mult', a, b, answer: a * b, questionText: `${a} × ${b}` };
  }
  if (key.startsWith('b_')) {
    // Skill key for two-digit × one-digit (no concrete operand yet)
    const n = parseInt(key.slice(2), 10);
    return { op: 'mult', a: 0, b: n, answer: 0, questionText: `2 xifres × ${n}` };
  }
  // div: d_P_Q  →  P ÷ Q = P/Q
  const parts = key.split('_');
  const p = parseInt(parts[1], 10);
  const q = parseInt(parts[2], 10);
  return { op: 'div', a: p, b: q, answer: p / q, questionText: `${p} : ${q}` };
}

// ── Two-digit × one-digit helpers ─────────────────────────────────────────────

// The mastery of a concrete instance (mb_AAxB) is tracked under its skill (b_B).
export function trackingKey(key: string): string {
  if (key.startsWith('mb_')) {
    const b = parseInt(key.slice(key.indexOf('x') + 1), 10);
    return `b_${b}`;
  }
  return key;
}

// Resolve a skill key into a concrete question with a random two-digit operand.
export function materializeQuestion(key: string): string {
  if (key.startsWith('b_')) {
    const n = parseInt(key.slice(2), 10);
    const aa = 11 + Math.floor(Math.random() * 89); // 11..99
    return `mb_${aa}x${n}`;
  }
  return key;
}

// ── Fact key generation ───────────────────────────────────────────────────────

// Pedagogical table order: easiest → hardest
const TABLE_ORDER = [1, 2, 10, 5, 3, 4, 9, 6, 7, 8];

export function getOrderedFactKeys(settings: Settings): string[] {
  const [min, max] = settings.tablesRange;
  const order = TABLE_ORDER.filter(n => n >= min && n <= max);
  const keys: string[] = [];
  const added = new Set<string>();

  const add = (k: string) => { if (!added.has(k)) { added.add(k); keys.push(k); } };

  if (settings.ops.mult) {
    for (const a of order) {
      for (let b = min; b <= max; b++) {
        add(`m_${a}x${b}`);
      }
    }
  }

  if (settings.ops.div) {
    for (const a of order) {
      for (let b = min; b <= max; b++) {
        const p = a * b;
        add(`d_${p}_${b}`); // p ÷ b = a
        if (a !== b) add(`d_${p}_${a}`); // p ÷ a = b
      }
    }
  }

  // Two-digit × one-digit skills, one per single-digit multiplier (hardest stage).
  if (settings.ops.multBig) {
    for (const n of TABLE_ORDER.filter(t => t >= 2 && t <= 9)) {
      add(`b_${n}`);
    }
  }

  return keys;
}

// ── Default stat ──────────────────────────────────────────────────────────────

export function defaultFactStat(): FactStat {
  return {
    seen: 0,
    correctFirstTry: 0,
    correctEventually: 0,
    wrong: 0,
    mastery: 0,
    lastSeen: 0,
    avgMs: 0,
    introduced: false,
    history: [],
  };
}

// ── Introduction logic ────────────────────────────────────────────────────────

const INITIAL_BATCH = 12;
const BATCH_SIZE = 6;
const INTRO_THRESHOLD = 0.6;

export function ensureIntroduced(
  facts: Record<string, FactStat>,
  settings: Settings,
): Record<string, FactStat> {
  const ordered = getOrderedFactKeys(settings);
  const updated = { ...facts };

  const alreadyIntroduced = ordered.filter(k => updated[k]?.introduced);

  if (alreadyIntroduced.length === 0) {
    for (const k of ordered.slice(0, INITIAL_BATCH)) {
      updated[k] = { ...defaultFactStat(), introduced: true };
    }
    return updated;
  }

  const meanMastery =
    alreadyIntroduced.reduce((s, k) => s + (updated[k]?.mastery ?? 0), 0) /
    alreadyIntroduced.length;

  if (meanMastery > INTRO_THRESHOLD) {
    const notYet = ordered.filter(k => !updated[k]?.introduced);
    for (const k of notYet.slice(0, BATCH_SIZE)) {
      updated[k] = { ...(updated[k] ?? defaultFactStat()), introduced: true };
    }
  }

  return updated;
}

// ── Weighted selection ────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function factWeight(stat: FactStat, now: number): number {
  const base = 1 - stat.mastery;                         // 0..1, high for weak facts
  const recency = (now - stat.lastSeen) > DAY_MS ? 0.2 : 0; // bonus if not seen today
  const floor = 0.05;                                    // always some chance
  return base + recency + floor;
}

export function selectNextFact(
  facts: Record<string, FactStat>,
  lastFactKey: string | null,
  settings: Settings,
): string {
  const introduced = getOrderedFactKeys(settings).filter(k => facts[k]?.introduced);
  if (introduced.length === 0) {
    return getOrderedFactKeys(settings)[0];
  }

  const now = Date.now();
  const weights = introduced.map(k => {
    const w = factWeight(facts[k]!, now);
    // Suppress immediate repetition
    return k === lastFactKey ? w * 0.1 : w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < introduced.length; i++) {
    r -= weights[i];
    if (r <= 0) return introduced[i];
  }
  return introduced[introduced.length - 1];
}

// ── Mastery update ────────────────────────────────────────────────────────────

export function updateMastery(
  stat: FactStat,
  result: FactResult,
  ms: number,
): FactStat {
  let delta: number;
  if (result === 'first') {
    delta = 0.15 * (1 - stat.mastery); // diminishing returns near 1
  } else if (result === 'retry') {
    delta = 0.05 * (1 - stat.mastery);
  } else {
    delta = -0.10;
  }

  const newMastery = Math.max(0, Math.min(1, stat.mastery + delta));
  const newSeen = stat.seen + 1;
  const newAvgMs =
    stat.seen === 0 ? ms : Math.round((stat.avgMs * stat.seen + ms) / newSeen);

  return {
    ...stat,
    seen: newSeen,
    correctFirstTry: stat.correctFirstTry + (result === 'first' ? 1 : 0),
    correctEventually: stat.correctEventually + (result !== 'wrong' ? 1 : 0),
    wrong: stat.wrong + (result === 'wrong' ? 1 : 0),
    mastery: newMastery,
    lastSeen: Date.now(),
    avgMs: newAvgMs,
    history: [
      ...stat.history.slice(-19),
      { ts: Date.now(), result, ms },
    ],
  };
}

// ── Session question generation ───────────────────────────────────────────────

export function generateSessionQuestions(
  facts: Record<string, FactStat>,
  settings: Settings,
  count: number,
): string[] {
  const questions: string[] = [];
  let last: string | null = null;
  for (let i = 0; i < count; i++) {
    const next = selectNextFact(facts, last, settings);
    questions.push(materializeQuestion(next));
    last = next; // suppress repetition on the skill, not the concrete instance
  }
  return questions;
}

export function generateExtraRoundQuestions(
  facts: Record<string, FactStat>,
  settings: Settings,
  count = 4,
): string[] {
  const candidates = getOrderedFactKeys(settings)
    .filter(k => facts[k]?.introduced && (facts[k]?.mastery ?? 0) >= 0.3)
    .sort((a, b) => (facts[b]?.mastery ?? 0) - (facts[a]?.mastery ?? 0))
    .slice(0, 20);

  if (candidates.length <= count) return candidates.map(materializeQuestion);

  const pool = [...candidates];
  const selected: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected.map(materializeQuestion);
}

// ── Simulation / self-test ────────────────────────────────────────────────────

export function runEngineSimulation(): {
  weakCount: number;
  strongCount: number;
  ratio: number;
  passes: boolean;
} {
  const settings: Settings = {
    parentPin: null,
    minAccuracy: 0.7,
    questionsPerSession: 12,
    softFailEnabled: true,
    ops: { mult: true, div: false, multBig: false },
    tablesRange: [2, 9],
    voucherMinutes: 60,
    soundEnabled: false,
    ttsEnabled: false,
    reportEmails: [],
  };

  const mockFacts: Record<string, FactStat> = {};
  const table2Keys = new Set<string>();
  const table7Keys = new Set<string>();

  for (let b = 2; b <= 9; b++) {
    const k2 = `m_2x${b}`;
    const k7 = `m_7x${b}`;
    mockFacts[k2] = { ...defaultFactStat(), introduced: true, mastery: 0.9, lastSeen: 0 };
    mockFacts[k7] = { ...defaultFactStat(), introduced: true, mastery: 0.1, lastSeen: 0 };
    table2Keys.add(k2);
    table7Keys.add(k7);
  }

  let weakCount = 0, strongCount = 0;
  let last: string | null = null;
  for (let i = 0; i < 200; i++) {
    const fact = selectNextFact(mockFacts, last, settings);
    if (table7Keys.has(fact)) weakCount++;
    else if (table2Keys.has(fact)) strongCount++;
    last = fact;
  }

  const ratio = weakCount / Math.max(1, strongCount);
  return { weakCount, strongCount, ratio, passes: ratio > 2 };
}
