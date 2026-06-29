'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadState,
  saveState,
} from '@/lib/storage';
import {
  ensureIntroduced,
  generateSessionQuestions,
  generateExtraRoundQuestions,
  parseFact,
  updateMastery,
  trackingKey,
  defaultFactStat,
} from '@/lib/engine';
import type { State, FactResult, Session, Voucher } from '@/lib/types';
import { NumericKeypad } from '@/components/NumericKeypad';
import { HintDisplay } from '@/components/HintDisplay';
import { SessionProgress } from '@/components/SessionProgress';
import { playSuccess, playGenial, playTryAgain, speak } from '@/lib/sounds';

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase =
  | 'question'
  | 'feedback-correct'
  | 'feedback-retry'
  | 'feedback-wrong'
  | 'session-end'
  | 'extra-offer'
  | 'extra-round'
  | 'complete';

interface AnswerRecord {
  factKey: string;
  result: FactResult;
  hintsUsed: number;
  ms: number;
}

const SUCCESS_MSGS = [
  'Molt bé! 🌟',
  'Genial! 🎉',
  'Ho has clavat! ✨',
  'Excel·lent! 🌸',
  'Fantàstic! 🌻',
];
const RETRY_MSGS = [
  'Ara sí! 👏',
  'Molt bé, ho has aconseguit! 🌱',
  'Ets increïble! 🌷',
];
const WRONG_MSGS = [
  'No passa res, la resposta era',
  'Tranquil·la, era',
  'La pròxima la tens, era',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Session page ──────────────────────────────────────────────────────────────
export default function SessionPage() {
  const router = useRouter();

  // Loaded once at mount
  const [state, setState] = useState<State | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [phase, setPhase] = useState<Phase>('question');
  const [retryCount, setRetryCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [wrongAnswer, setWrongAnswer] = useState<number | null>(null);
  const [isExtraRound, setIsExtraRound] = useState(false);
  const [extraIdx, setExtraIdx] = useState(0);
  const [extraQuestions, setExtraQuestions] = useState<string[]>([]);
  const [extraAnswers, setExtraAnswers] = useState<AnswerRecord[]>([]);
  const [leveledUp, setLeveledUp] = useState(false);

  const startMsRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());

  // Load state + generate questions
  useEffect(() => {
    const s = loadState();
    s.facts = ensureIntroduced(s.facts, s.settings);
    const qs = generateSessionQuestions(s.facts, s.settings, s.settings.questionsPerSession);
    setQuestions(qs);
    setState(s);
    sessionStartRef.current = Date.now();
    startMsRef.current = Date.now();
  }, []);

  // TTS: read question aloud when it changes
  useEffect(() => {
    if (!state || questions.length === 0 || phase !== 'question') return;
    const key = isExtraRound ? extraQuestions[extraIdx] : questions[currentIdx];
    if (!key) return;
    const fact = parseFact(key);
    if (state.settings.ttsEnabled) {
      speak(`Quant és ${fact.questionText}?`, true);
    }
    // Reset timer for this question
    startMsRef.current = Date.now();
  }, [currentIdx, extraIdx, isExtraRound, phase, questions, extraQuestions, state]);

  const currentKey = isExtraRound
    ? extraQuestions[extraIdx]
    : questions[currentIdx];
  const currentFact = currentKey ? parseFact(currentKey) : null;

  // ── Confirm answer ──────────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!state || !currentFact || !currentKey) return;
    const answer = parseInt(currentInput, 10);
    if (isNaN(answer)) return;

    const ms = Date.now() - startMsRef.current;
    const isCorrect = answer === currentFact.answer;

    if (isCorrect) {
      const result: FactResult = retryCount === 0 ? 'first' : 'retry';
      const msg = result === 'first'
        ? randomFrom(SUCCESS_MSGS)
        : randomFrom(RETRY_MSGS);

      setFeedbackMsg(msg);
      setPhase(result === 'first' ? 'feedback-correct' : 'feedback-retry');

      if (state.settings.soundEnabled) {
        result === 'first' ? playGenial() : playSuccess();
      }

      // Update state — concrete two-digit instances are tracked under their skill key
      const trackKey = trackingKey(currentKey);
      const newRecord: AnswerRecord = { factKey: trackKey, result, hintsUsed: hintCount, ms };
      const updatedFacts = {
        ...state.facts,
        [trackKey]: updateMastery(state.facts[trackKey] ?? defaultFactStat(), result, ms),
      };
      const newState = { ...state, facts: updatedFacts };
      setState(newState);
      saveState(newState);

      if (isExtraRound) {
        setExtraAnswers(prev => [...prev, newRecord]);
      } else {
        setAnswers(prev => [...prev, newRecord]);
      }

      // Advance after brief feedback
      setTimeout(() => advanceToNext(newRecord, newState), 1200);

    } else {
      // Wrong answer
      if (state.settings.soundEnabled) playTryAgain();

      if (retryCount >= 2) {
        // Show the answer after 2 failed retries
        const trackKey = trackingKey(currentKey);
        const newRecord: AnswerRecord = { factKey: trackKey, result: 'wrong', hintsUsed: hintCount, ms };
        setWrongAnswer(currentFact.answer);
        setFeedbackMsg(randomFrom(WRONG_MSGS));
        setPhase('feedback-wrong');

        const updatedFacts = {
          ...state.facts,
          [trackKey]: updateMastery(state.facts[trackKey] ?? defaultFactStat(), 'wrong', ms),
        };
        const newState = { ...state, facts: updatedFacts };
        setState(newState);
        saveState(newState);

        if (isExtraRound) {
          setExtraAnswers(prev => [...prev, newRecord]);
        } else {
          setAnswers(prev => [...prev, newRecord]);
        }

        setTimeout(() => advanceToNext(newRecord, newState), 2000);
      } else {
        // Gentle retry
        setRetryCount(r => r + 1);
        setFeedbackMsg(
          retryCount === 0
            ? 'Quasi! Torna-ho a provar 🌿'
            : 'Tranquil·la, ho tornem a provar 💛',
        );
        setPhase('feedback-retry');
        setTimeout(() => {
          setCurrentInput('');
          setPhase('question');
        }, 1000);
      }
    }
  }, [state, currentFact, currentKey, currentInput, retryCount, hintCount, isExtraRound]);

  const advanceToNext = useCallback(
    (lastRecord: AnswerRecord, currentState: State) => {
      setCurrentInput('');
      setRetryCount(0);
      setShowHint(false);
      setHintCount(0);
      setWrongAnswer(null);

      if (isExtraRound) {
        const nextIdx = extraIdx + 1;
        if (nextIdx >= extraQuestions.length) {
          // Extra round done → complete regardless of score
          finishSession(
            [...extraAnswers, lastRecord],
            currentState,
            true, // extra round always grants voucher
          );
        } else {
          setExtraIdx(nextIdx);
          setPhase('question');
        }
      } else {
        const nextIdx = currentIdx + 1;
        if (nextIdx >= questions.length) {
          // Regular session done
          evaluateSession([...answers, lastRecord], currentState);
        } else {
          setCurrentIdx(nextIdx);
          setPhase('question');
        }
      }
    },
    [isExtraRound, extraIdx, extraQuestions, extraAnswers, currentIdx, questions, answers],
  );

  const evaluateSession = useCallback(
    (allAnswers: AnswerRecord[], currentState: State) => {
      const total = allAnswers.length;
      const firstTryCorrect = allAnswers.filter(a => a.result === 'first').length;
      const accuracy = total > 0 ? firstTryCorrect / total : 0;
      const passed = accuracy >= currentState.settings.minAccuracy;

      if (passed) {
        finishSession(allAnswers, currentState, true);
      } else if (currentState.settings.softFailEnabled) {
        setPhase('extra-offer');
      } else {
        finishSession(allAnswers, currentState, false);
      }
    },
    [],
  );

  const startExtraRound = useCallback(() => {
    if (!state) return;
    const extra = generateExtraRoundQuestions(state.facts, state.settings, 4);
    setExtraQuestions(extra);
    setExtraAnswers([]);
    setExtraIdx(0);
    setIsExtraRound(true);
    setPhase('question');
  }, [state]);

  const finishSession = useCallback(
    (allAnswers: AnswerRecord[], currentState: State, granted: boolean) => {
      const total = allAnswers.length;
      const firstTry = allAnswers.filter(a => a.result === 'first').length;
      const accuracy = total > 0 ? firstTry / total : 0;
      const passed = granted;

      const sessionId = crypto.randomUUID();
      const now = Date.now();

      let voucher: Voucher | undefined;
      if (passed) {
        voucher = {
          id: crypto.randomUUID(),
          sessionId,
          issuedAt: now,
          minutes: currentState.settings.voucherMinutes,
          status: 'pending',
          validatedByAdult: false,
        };
      }

      const session: Session = {
        id: sessionId,
        startedAt: sessionStartRef.current,
        endedAt: now,
        total,
        correctFirstTry: firstTry,
        firstTryAccuracy: accuracy,
        passed,
        voucherId: voucher?.id,
        facts: allAnswers.map(a => a.factKey),
      };

      // Update streak
      const today = new Date().toISOString().slice(0, 10);
      const lastDate = currentState.streak.lastPlayedDate;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let streak = { ...currentState.streak };
      if (lastDate !== today) {
        const newCurrent = lastDate === yesterday ? streak.current + 1 : 1;
        streak = {
          current: newCurrent,
          longest: Math.max(newCurrent, streak.longest),
          lastPlayedDate: today,
        };
      }

      // Also introduce new facts if mean mastery is high enough
      const updatedFacts = ensureIntroduced(currentState.facts, currentState.settings);

      // Auto-escalate voucher difficulty after 4 consecutive passed sessions
      const allSessions = [...currentState.sessions, session];
      const consecutivePassed = (() => {
        let n = 0;
        for (let i = allSessions.length - 1; i >= 0; i--) {
          if (allSessions[i].passed) n++;
          else break;
        }
        return n;
      })();
      const ESCALATE_AFTER = 4;
      const MAX_ACCURACY = 0.90;
      const didLevel =
        passed &&
        consecutivePassed >= ESCALATE_AFTER &&
        currentState.settings.minAccuracy < MAX_ACCURACY;
      const newMinAccuracy = didLevel
        ? Math.min(MAX_ACCURACY, Math.round((currentState.settings.minAccuracy + 0.05) * 100) / 100)
        : currentState.settings.minAccuracy;

      const newState: State = {
        ...currentState,
        facts: updatedFacts,
        settings: { ...currentState.settings, minAccuracy: newMinAccuracy },
        sessions: allSessions,
        vouchers: voucher
          ? [...currentState.vouchers, voucher]
          : currentState.vouchers,
        streak,
      };

      if (didLevel) setLeveledUp(true);
      saveState(newState);
      setState(newState);

      setAnswers(allAnswers);
      setPhase('session-end');
    },
    [],
  );

  const handleSkipVoucher = () => router.push('/');
  const handleGoHome = () => router.push('/');

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!state || questions.length === 0) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <p className="text-2xl text-green-700">🌱 Preparant...</p>
      </div>
    );
  }

  // Session end screen
  if (phase === 'session-end') {
    const total = answers.length;
    const firstTry = answers.filter(a => a.result === 'first').length;
    // Use the stored session's verdict — recomputing here would mark a
    // soft-fail extra round (voucher granted) as "failed", and could clash
    // with the just-escalated minAccuracy threshold.
    const lastSession = state.sessions[state.sessions.length - 1];
    const passed = lastSession?.passed ?? false;
    const newVoucher = state.vouchers.find(
      v => v.sessionId === lastSession?.id,
    );

    return (
      <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center px-6 py-10 gap-7">
        {passed ? (
          <>
            <p className="text-7xl pop-in">🌸</p>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-green-800 pop-in">
                Ho has aconseguit!
              </h2>
              <p className="text-xl text-green-700 fade-up">
                Has guanyat un val de tablet 🌱
              </p>
            </div>
            {leveledUp && (
              <div className="w-full max-w-sm bg-amber-100 border-2 border-amber-300 rounded-2xl p-4 text-center fade-up">
                <p className="text-2xl">⭐</p>
                <p className="text-base font-bold text-amber-800">Ets una crack!</p>
                <p className="text-sm text-amber-700">
                  A partir d&apos;ara el llindar és del{' '}
                  <strong>{Math.round((state.settings.minAccuracy) * 100)}%</strong>.
                  El repte puja!
                </p>
              </div>
            )}
            {newVoucher && (
              <div className="w-full max-w-sm bg-green-100 border-2 border-green-300 rounded-3xl p-6 text-center space-y-3 fade-up">
                <p className="text-4xl">🎟️</p>
                <p className="text-2xl font-extrabold text-green-800">
                  Val d&apos;{newVoucher.minutes} min de tablet
                </p>
                <p className="text-slate-600">
                  Un adult ha de validar el val
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-6xl">🌿</p>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-amber-800">
                Avui no hi arribem
              </h2>
              <p className="text-xl text-slate-600">
                Demà ho tornem a provar! 💛
              </p>
            </div>
          </>
        )}

        <div className="w-full max-w-sm space-y-3">
          <div className="bg-white rounded-2xl p-4 flex justify-around text-center border border-slate-100 shadow-sm">
            <div>
              <p className="text-3xl font-extrabold text-green-700">{firstTry}</p>
              <p className="text-sm text-slate-500">a la primera</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-amber-600">
                {answers.filter(a => a.result === 'retry').length}
              </p>
              <p className="text-sm text-slate-500">al 2n intent</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-500">{total}</p>
              <p className="text-sm text-slate-500">total</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleGoHome}
          className="w-full max-w-sm bg-green-600 text-white font-extrabold text-2xl py-5 rounded-3xl shadow-md hover:bg-green-700 active:scale-95 transition-all"
        >
          Tornar al jardí 🌿
        </button>
      </div>
    );
  }

  // Extra round offer
  if (phase === 'extra-offer') {
    return (
      <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center px-6 py-10 gap-6">
        <p className="text-6xl pop-in">💛</p>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-amber-700">
            Una mica més i el tens!
          </h2>
          <p className="text-xl text-slate-600">
            Vols fer una rondeta curta?
          </p>
          <p className="text-base text-slate-400">
            (4 preguntes fàcils per aconseguir el val)
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={startExtraRound}
            className="bg-green-600 text-white font-extrabold text-2xl py-5 rounded-3xl shadow-md hover:bg-green-700 active:scale-95 transition-all"
          >
            Sí, comencem! 🌻
          </button>
          <button
            onClick={() => {
              const all = answers;
              finishSession(all, state, false);
            }}
            className="text-slate-400 text-base underline text-center py-2"
          >
            Deixar per avui
          </button>
        </div>
      </div>
    );
  }

  // Question / feedback screen
  const progressResults = answers.map(a => a.result);
  const totalForProgress = questions.length + (isExtraRound ? extraQuestions.length : 0);
  const allResults = isExtraRound
    ? [...answers.map(a => a.result), ...extraAnswers.map(a => a.result)]
    : answers.map(a => a.result);
  const currentProgressIdx = isExtraRound
    ? answers.length + extraIdx
    : currentIdx;

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={() => router.push('/')}
          className="text-slate-400 text-2xl px-2 py-1 hover:text-slate-600"
          aria-label="Tornar"
        >
          ←
        </button>
        <SessionProgress
          total={questions.length + (isExtraRound ? extraQuestions.length : 0)}
          current={currentProgressIdx}
          results={allResults as ('first' | 'retry' | 'wrong' | 'pending')[]}
        />
        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-between px-5 pb-6">

        {/* Question area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-xs">
          {phase === 'question' && currentFact && (
            <>
              <p className="text-2xl text-slate-500 font-semibold text-center">
                Quant és
              </p>
              <p className="text-6xl font-extrabold text-slate-900 text-center leading-none">
                {currentFact.questionText}?
              </p>

              {/* Answer display */}
              <div className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 text-center min-h-[72px] flex items-center justify-center shadow-sm">
                <span className="text-5xl font-bold text-slate-800">
                  {currentInput || (
                    <span className="text-slate-300">_ _</span>
                  )}
                </span>
              </div>

              {/* Hint */}
              {showHint && (
                <div className="w-full fade-up">
                  <HintDisplay fact={currentFact} />
                </div>
              )}

              {!showHint && (
                <button
                  onClick={() => { setShowHint(true); setHintCount(h => h + 1); }}
                  className="text-amber-600 font-semibold text-lg underline"
                >
                  Vols una pista? 💡
                </button>
              )}
            </>
          )}

          {/* Feedback messages */}
          {(phase === 'feedback-correct' || phase === 'feedback-retry') && (
            <div className="flex flex-col items-center gap-4 pop-in">
              <p className="text-5xl">
                {phase === 'feedback-correct' ? '🌟' : '🌱'}
              </p>
              <p className="text-3xl font-extrabold text-green-700 text-center">
                {feedbackMsg}
              </p>
            </div>
          )}

          {phase === 'feedback-wrong' && (
            <div className="flex flex-col items-center gap-4 pop-in">
              <p className="text-5xl">💛</p>
              <p className="text-2xl font-bold text-amber-700 text-center">
                {feedbackMsg}{' '}
                <span className="text-green-800">{wrongAnswer}</span>
              </p>
            </div>
          )}
        </div>

        {/* Keypad — only shown in question phase */}
        {phase === 'question' && (
          <div className="w-full max-w-xs space-y-4">
            <NumericKeypad
              onDigit={d => {
                if (currentInput.length < 4) setCurrentInput(prev => prev + d);
              }}
              onBackspace={() => setCurrentInput(prev => prev.slice(0, -1))}
              onConfirm={handleConfirm}
              confirmDisabled={currentInput.length === 0}
            />
          </div>
        )}
      </div>
    </div>
  );
}
