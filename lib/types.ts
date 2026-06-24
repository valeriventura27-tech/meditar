export type FactResult = 'first' | 'retry' | 'wrong';

export interface FactHistoryEntry {
  ts: number;
  result: FactResult;
  ms: number;
}

export interface FactStat {
  seen: number;
  correctFirstTry: number;
  correctEventually: number;
  wrong: number;
  mastery: number;        // 0..1
  lastSeen: number;       // timestamp ms
  avgMs: number;
  introduced: boolean;
  history: FactHistoryEntry[];
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number;
  total: number;
  correctFirstTry: number;
  firstTryAccuracy: number;
  passed: boolean;
  voucherId?: string;
  facts: string[];
}

export interface Voucher {
  id: string;
  sessionId: string;
  issuedAt: number;
  minutes: number;
  status: 'pending' | 'active' | 'used' | 'expired';
  validatedByAdult: boolean;
  validatedAt?: number;
  activatedAt?: number;
  expiresAt?: number;
}

export interface Settings {
  parentPin: string | null;
  minAccuracy: number;
  questionsPerSession: number;
  softFailEnabled: boolean;
  ops: { mult: boolean; div: boolean };
  tablesRange: [number, number];
  voucherMinutes: number;
  soundEnabled: boolean;
  ttsEnabled: boolean;
}

export interface State {
  version: 1;
  settings: Settings;
  facts: Record<string, FactStat>;
  sessions: Session[];
  vouchers: Voucher[];
  streak: { current: number; longest: number; lastPlayedDate: string | null };
}

export interface ParsedFact {
  op: 'mult' | 'div';
  a: number;
  b: number;
  answer: number;
  questionText: string;
}
