'use client';
import type { ParsedFact } from '@/lib/types';

interface Props {
  fact: ParsedFact;
}

export function HintDisplay({ fact }: Props) {
  return fact.op === 'mult' ? (
    <MultHint a={fact.a} b={fact.b} />
  ) : (
    <DivHint product={fact.a} divisor={fact.b} answer={fact.answer} />
  );
}

function MultHint({ a, b }: { a: number; b: number }) {
  // Two-digit × one-digit: show the distributive (split into tens + units) method
  if (a >= 10) {
    const tens = Math.floor(a / 10) * 10;
    const units = a % 10;
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3 text-center">
        <p className="text-amber-700 font-bold text-lg">Pista 💡</p>
        <p className="text-slate-600 text-sm">Separa el número gros:</p>
        <p className="text-slate-800 font-bold text-lg leading-relaxed">
          {a} × {b} = ({tens} × {b}) + ({units} × {b})
        </p>
        <p className="text-slate-700 font-semibold">
          = {tens * b} + {units * b}
        </p>
        <p className="text-green-700 font-extrabold text-xl">
          = {tens * b + units * b}
        </p>
      </div>
    );
  }

  const skipCount = Array.from({ length: a }, (_, i) => (i + 1) * b);
  const showGrid = a <= 10 && b <= 10 && a * b <= 100;

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3 text-center">
      <p className="text-amber-700 font-bold text-lg">Pista 💡</p>

      {showGrid && (
        <div className="flex flex-col gap-1 items-center">
          {Array.from({ length: a }, (_, row) => (
            <div key={row} className="flex gap-1">
              {Array.from({ length: b }, (_, col) => (
                <div
                  key={col}
                  className="w-4 h-4 rounded-full bg-amber-400"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="text-slate-600 text-sm">
        Comptem de {b} en {b}:
      </p>
      <p className="text-slate-700 font-semibold text-base">
        {skipCount.join(' · ')}
      </p>
    </div>
  );
}

function DivHint({
  product,
  divisor,
  answer,
}: {
  product: number;
  divisor: number;
  answer: number;
}) {
  const showGroups = answer <= 12 && divisor <= 12;

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3 text-center">
      <p className="text-amber-700 font-bold text-lg">Pista 💡</p>

      <p className="text-slate-700">
        Quants {divisor}s hi caben a {product}?
      </p>
      <p className="text-slate-700 font-semibold">
        {divisor} × ? = {product}
      </p>

      {showGroups && (
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: answer }, (_, gi) => (
            <div key={gi} className="flex gap-0.5 border border-amber-300 rounded p-1">
              {Array.from({ length: divisor }, (_, di) => (
                <div key={di} className="w-3 h-3 rounded-full bg-amber-400" />
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="text-slate-500 text-xs">
        {answer} grups de {divisor} = {product}
      </p>
    </div>
  );
}
