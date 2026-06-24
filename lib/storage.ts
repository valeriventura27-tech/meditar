'use client';
import type { State, Settings } from './types';

const STORAGE_KEY = 'jdn_state_v1';

export const DEFAULT_SETTINGS: Settings = {
  parentPin: null,
  minAccuracy: 0.7,
  questionsPerSession: 12,
  softFailEnabled: true,
  ops: { mult: true, div: true },
  tablesRange: [1, 10],
  voucherMinutes: 60,
  soundEnabled: true,
  ttsEnabled: false,
};

export function defaultState(): State {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    facts: {},
    sessions: [],
    vouchers: [],
    streak: { current: 0, longest: 0, lastPlayedDate: null },
  };
}

export function loadState(): State {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<State>;
    if (parsed?.version !== 1) return defaultState();
    return {
      ...defaultState(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: State): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or unavailable — silently ignore
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
