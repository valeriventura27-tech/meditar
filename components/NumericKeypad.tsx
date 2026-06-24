'use client';

interface Props {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

const btn =
  'flex items-center justify-center rounded-2xl text-3xl font-bold h-16 w-full select-none transition-transform active:scale-95 touch-manipulation';

export function NumericKeypad({ onDigit, onBackspace, onConfirm, confirmDisabled }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
        <button
          key={d}
          className={`${btn} bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm`}
          onClick={() => onDigit(d)}
        >
          {d}
        </button>
      ))}
      <button
        className={`${btn} bg-amber-100 border-2 border-amber-200 text-amber-800 hover:bg-amber-200 shadow-sm`}
        onClick={onBackspace}
      >
        ⌫
      </button>
      <button
        className={`${btn} bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm`}
        onClick={() => onDigit('0')}
      >
        0
      </button>
      <button
        className={`${btn} bg-green-600 text-white hover:bg-green-700 shadow-md disabled:opacity-40 disabled:cursor-not-allowed`}
        onClick={onConfirm}
        disabled={confirmDisabled}
      >
        ✓
      </button>
    </div>
  );
}
