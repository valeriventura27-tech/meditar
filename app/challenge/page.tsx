'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadState } from '@/lib/storage';
import { parseFact, getOrderedFactKeys, defaultFactStat } from '@/lib/engine';
import type { FactStat, Settings } from '@/lib/types';
import { NumericKeypad } from '@/components/NumericKeypad';
import { playSuccess, playTryAgain } from '@/lib/sounds';

const QUESTIONS = 10;
const TIME_LIMIT = 60; // seconds per player

type Phase =
  | 'setup'
  | 'p1-countdown'
  | 'p1-playing'
  | 'p2-countdown'
  | 'p2-playing'
  | 'results';

function pickQuestions(facts: Record<string, FactStat>, settings: Settings): string[] {
  const introduced = getOrderedFactKeys(settings).filter(
    k => facts[k]?.introduced && !k.startsWith('b_'),
  );
  if (introduced.length === 0) return [];
  const shuffled = [...introduced].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(QUESTIONS, shuffled.length));
}

// ── Countdown overlay ──────────────────────────────────────────────────────────
function Countdown({ name, onDone }: { name: string; onDone: () => void }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count === 0) { onDone(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 800);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center gap-6 px-6">
      <p className="text-2xl font-bold text-slate-600">Prepara&apos;t,</p>
      <p className="text-4xl font-extrabold text-green-800">{name}!</p>
      {count > 0 ? (
        <p className="text-9xl font-extrabold text-green-600 pop-in" key={count}>{count}</p>
      ) : (
        <p className="text-5xl pop-in">🚀</p>
      )}
    </div>
  );
}

// ── Playing screen ────────────────────────────────────────────────────────────
function PlayingScreen({
  playerName,
  questions,
  soundEnabled,
  onDone,
}: {
  playerName: string;
  questions: string[];
  soundEnabled: boolean;
  onDone: (correct: number, answers: boolean[]) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const doneRef = useRef(false);

  const finish = useCallback((c: number, a: boolean[]) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(c, a);
  }, [onDone]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { finish(correct, answers); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [correct, answers, finish]);

  const handleConfirm = useCallback(() => {
    if (doneRef.current) return;
    const fact = parseFact(questions[idx]);
    const answer = parseInt(input, 10);
    const isCorrect = !isNaN(answer) && answer === fact.answer;

    setFlash(isCorrect ? 'good' : 'bad');
    if (soundEnabled) isCorrect ? playSuccess() : playTryAgain();

    const newCorrect = correct + (isCorrect ? 1 : 0);
    const newAnswers = [...answers, isCorrect];

    setTimeout(() => {
      setFlash(null);
      setInput('');
      if (idx + 1 >= questions.length) {
        finish(newCorrect, newAnswers);
      } else {
        setIdx(i => i + 1);
        setCorrect(newCorrect);
        setAnswers(newAnswers);
      }
    }, 500);
  }, [input, idx, questions, correct, answers, soundEnabled, finish]);

  const fact = parseFact(questions[idx]);
  const pct = (timeLeft / TIME_LIMIT) * 100;
  const barColor = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-amber-400' : 'bg-red-400';

  const flashBg = flash === 'good'
    ? 'bg-green-100'
    : flash === 'bad'
    ? 'bg-red-100'
    : 'bg-yellow-50';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${flashBg}`}>
      {/* Top bar */}
      <div className="px-5 pt-5 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-green-800 text-lg">{playerName}</p>
          <p className="font-bold text-slate-600">{idx + 1}/{questions.length}</p>
          <p className="font-bold text-slate-700 text-lg">{timeLeft}s</p>
        </div>
        {/* Timer bar */}
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Progress dots */}
        <div className="flex gap-1 justify-center">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i < answers.length
                  ? answers[i] ? 'bg-green-500' : 'bg-red-400'
                  : i === idx ? 'bg-amber-400' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5">
        <p className="text-2xl text-slate-400 font-semibold">Quant és</p>
        <p className="text-7xl font-extrabold text-slate-900 leading-none">
          {fact.questionText}?
        </p>
        <div className="w-full max-w-xs bg-white border-2 border-slate-200 rounded-2xl py-4 text-center min-h-[72px] flex items-center justify-center shadow-sm">
          <span className="text-5xl font-bold text-slate-800">
            {input || <span className="text-slate-300">_ _</span>}
          </span>
        </div>
      </div>

      {/* Keypad */}
      <div className="px-5 pb-6 max-w-xs mx-auto w-full">
        <NumericKeypad
          onDigit={d => { if (input.length < 4) setInput(p => p + d); }}
          onBackspace={() => setInput(p => p.slice(0, -1))}
          onConfirm={handleConfirm}
          confirmDisabled={input.length === 0}
        />
      </div>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────
function Results({
  p1Name,
  p1Score,
  p1Answers,
  p2Name,
  p2Score,
  p2Answers,
  questions,
  onPlayAgain,
  onHome,
}: {
  p1Name: string;
  p1Score: number;
  p1Answers: boolean[];
  p2Name: string;
  p2Score: number;
  p2Answers: boolean[];
  questions: string[];
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const tie = p1Score === p2Score;
  const p1Wins = p1Score > p2Score;

  const Medal = ({ wins, name, score }: { wins: boolean; name: string; score: number }) => (
    <div className={`flex-1 rounded-3xl p-5 text-center space-y-1 ${wins || tie ? 'bg-green-100 border-2 border-green-300' : 'bg-slate-100 border-2 border-slate-200'}`}>
      <p className="text-4xl">{wins ? '🥇' : tie ? '🤝' : '🥈'}</p>
      <p className="font-extrabold text-xl text-slate-800">{name}</p>
      <p className="text-4xl font-extrabold text-green-700">{score}<span className="text-xl text-slate-400">/{QUESTIONS}</span></p>
      <p className="text-sm text-slate-500">{Math.round((score / QUESTIONS) * 100)}% encert</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center px-6 py-10 gap-6">
      <p className="text-6xl pop-in">{tie ? '🤝' : '🎉'}</p>
      <h2 className="text-3xl font-extrabold text-green-800 text-center">
        {tie ? 'Empat! Dos guanyadors!' : p1Wins ? `Guanya la ${p1Name}!` : `Guanya ${p2Name}!`}
      </h2>

      <div className="flex gap-3 w-full max-w-sm">
        <Medal wins={p1Wins} name={p1Name} score={p1Score} />
        <Medal wins={!p1Wins} name={p2Name} score={p2Score} />
      </div>

      {/* Per-question breakdown */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
        <p className="text-sm font-bold text-slate-600">Preguntes</p>
        {questions.map((k, i) => {
          const fact = parseFact(k);
          return (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700 w-28">{fact.questionText} = {fact.answer}</span>
              <span className={p1Answers[i] ? 'text-green-600 font-bold' : 'text-red-400'}>{p1Answers[i] ? '✓' : '✗'} {p1Name.slice(0,8)}</span>
              <span className={p2Answers[i] ? 'text-green-600 font-bold' : 'text-red-400'}>{p2Answers[i] ? '✓' : '✗'} {p2Name.slice(0,8)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={onPlayAgain}
          className="bg-green-600 text-white font-extrabold text-2xl py-5 rounded-3xl shadow-md hover:bg-green-700 active:scale-95 transition-all"
        >
          Tornem-hi! 🔄
        </button>
        <button
          onClick={onHome}
          className="text-slate-400 text-base underline text-center py-2"
        >
          Tornar al jardí
        </button>
      </div>
    </div>
  );
}

// ── Challenge page ─────────────────────────────────────────────────────────────
export default function ChallengePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('setup');
  const [guestName, setGuestName] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [p1Score, setP1Score] = useState(0);
  const [p1Answers, setP1Answers] = useState<boolean[]>([]);
  const [p2Score, setP2Score] = useState(0);
  const [p2Answers, setP2Answers] = useState<boolean[]>([]);
  const [key, setKey] = useState(0); // force remount for replays

  useEffect(() => {
    const s = loadState();
    setSoundEnabled(s.settings.soundEnabled);
    setQuestions(pickQuestions(s.facts, s.settings));
  }, [key]);

  const handleStart = () => {
    if (!guestName.trim() || questions.length === 0) return;
    setPhase('p1-countdown');
  };

  const handleP1Done = (score: number, answers: boolean[]) => {
    setP1Score(score);
    setP1Answers(answers);
    setPhase('p2-countdown');
  };

  const handleP2Done = (score: number, answers: boolean[]) => {
    setP2Score(score);
    setP2Answers(answers);
    setPhase('results');
  };

  const handlePlayAgain = () => {
    setP1Score(0); setP1Answers([]);
    setP2Score(0); setP2Answers([]);
    setKey(k => k + 1);
    setPhase('p1-countdown');
  };

  // Setup screen
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center px-6 py-10 gap-8">
        <div className="text-center space-y-2">
          <p className="text-6xl">🎮</p>
          <h1 className="text-3xl font-extrabold text-green-900">Repte a dos!</h1>
          <p className="text-slate-600">{QUESTIONS} preguntes · {TIME_LIMIT} segons cada jugador</p>
        </div>

        <div className="w-full max-w-xs space-y-5">
          <div className="bg-green-100 border-2 border-green-300 rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-3xl">🌸</span>
            <div>
              <p className="text-xs text-green-600 font-semibold">JUGADORA 1</p>
              <p className="text-xl font-extrabold text-green-900">Valeria</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400 font-bold text-lg justify-center">
            VS
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 space-y-2">
            <p className="text-xs text-slate-500 font-semibold">JUGADOR/A 2</p>
            <input
              type="text"
              placeholder="Nom del convidat…"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              maxLength={16}
              autoFocus
              className="w-full text-xl font-extrabold text-slate-900 bg-transparent outline-none placeholder:text-slate-300"
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!guestName.trim() || questions.length === 0}
            className="w-full bg-green-600 text-white font-extrabold text-2xl py-5 rounded-3xl shadow-md hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Comencem el repte! 🚀
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full text-slate-400 text-sm underline text-center"
          >
            Cancel·lar
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'p1-countdown') {
    return <Countdown name="Valeria" onDone={() => setPhase('p1-playing')} />;
  }

  if (phase === 'p1-playing') {
    return (
      <PlayingScreen
        key={`p1-${key}`}
        playerName="Valeria"
        questions={questions}
        soundEnabled={soundEnabled}
        onDone={handleP1Done}
      />
    );
  }

  if (phase === 'p2-countdown') {
    return <Countdown name={guestName} onDone={() => setPhase('p2-playing')} />;
  }

  if (phase === 'p2-playing') {
    return (
      <PlayingScreen
        key={`p2-${key}`}
        playerName={guestName}
        questions={questions}
        soundEnabled={soundEnabled}
        onDone={handleP2Done}
      />
    );
  }

  return (
    <Results
      p1Name="Valeria"
      p1Score={p1Score}
      p1Answers={p1Answers}
      p2Name={guestName}
      p2Score={p2Score}
      p2Answers={p2Answers}
      questions={questions}
      onPlayAgain={handlePlayAgain}
      onHome={() => router.push('/')}
    />
  );
}
