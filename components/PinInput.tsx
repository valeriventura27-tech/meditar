'use client';
import { useState } from 'react';
import { NumericKeypad } from './NumericKeypad';

interface Props {
  onComplete: (pin: string) => void;
  label?: string;
  errorMessage?: string;
}

export function PinInput({ onComplete, label, errorMessage }: Props) {
  const [pin, setPin] = useState('');

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      onComplete(next);
      setPin('');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {label && (
        <p className="text-xl text-slate-700 font-semibold text-center">{label}</p>
      )}
      <div className="flex gap-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-colors ${
              i < pin.length
                ? 'bg-green-600 border-green-600'
                : 'border-slate-300 bg-white'
            }`}
          />
        ))}
      </div>
      {errorMessage && (
        <p className="text-amber-700 text-base font-medium">{errorMessage}</p>
      )}
      <NumericKeypad
        onDigit={handleDigit}
        onBackspace={() => setPin(p => p.slice(0, -1))}
        onConfirm={() => {
          if (pin.length === 4) { onComplete(pin); setPin(''); }
        }}
        confirmDisabled={pin.length < 4}
      />
    </div>
  );
}
