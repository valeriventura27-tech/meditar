interface Props {
  total: number;
  current: number;
  results: ('first' | 'retry' | 'wrong' | 'pending')[];
}

export function SessionProgress({ total, current, results }: Props) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {Array.from({ length: total }, (_, i) => {
        const r = results[i] ?? 'pending';
        const isCurrent = i === current;
        let cls = 'bg-slate-200';
        if (r === 'first') cls = 'bg-green-400';
        else if (r === 'retry') cls = 'bg-amber-300';
        else if (r === 'wrong') cls = 'bg-orange-400';
        if (isCurrent) cls = 'bg-slate-400 ring-2 ring-offset-2 ring-slate-500';
        return (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors ${cls}`}
          />
        );
      })}
    </div>
  );
}
