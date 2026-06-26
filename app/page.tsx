'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loadState, saveState } from '@/lib/storage';
import { ensureIntroduced } from '@/lib/engine';
import type { State, Voucher } from '@/lib/types';
import { Garden } from '@/components/Garden';
import { VoucherCard } from '@/components/VoucherCard';
import { PinInput } from '@/components/PinInput';

// ── PIN Setup screen (first run) ─────────────────────────────────────────────
function PinSetupScreen({ onDone }: { onDone: (pin: string) => void }) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState('');

  const handleFirst = (pin: string) => {
    setFirst(pin);
    setStep('confirm');
  };

  const handleConfirm = (pin: string) => {
    if (pin === first) {
      onDone(pin);
    } else {
      setStep('enter');
      setFirst('');
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center px-6 py-12 gap-8">
      <div className="text-center space-y-3">
        <p className="text-5xl">🌱</p>
        <h1 className="text-3xl font-extrabold text-green-900">El Jardí dels Números</h1>
        <p className="text-lg text-slate-600">Benvinguda! Primer hem de configurar un PIN per a les persones adultes.</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        {step === 'enter' ? (
          <>
            <p className="text-center text-slate-700 font-semibold">
              Escriu un PIN de 4 xifres (adult/a)
            </p>
            <PinInput onComplete={handleFirst} />
          </>
        ) : (
          <>
            <p className="text-center text-slate-700 font-semibold">
              Confirma el PIN
            </p>
            <PinInput
              onComplete={handleConfirm}
              errorMessage={undefined}
            />
            <button
              onClick={() => { setStep('enter'); setFirst(''); }}
              className="w-full text-slate-400 text-sm underline text-center"
            >
              Tornar a escriure
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Home screen ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const s = loadState();
    // Ensure initial facts are introduced
    s.facts = ensureIntroduced(s.facts, s.settings);
    saveState(s);
    setState(s);
  }, []);

  const handlePinSetup = useCallback((pin: string) => {
    setState(prev => {
      if (!prev) return prev;
      const next = { ...prev, settings: { ...prev.settings, parentPin: pin } };
      saveState(next);
      return next;
    });
  }, []);

  const handleValidateVoucher = useCallback((voucherId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const voucher = prev.vouchers.find(v => v.id === voucherId);
      if (!voucher) return prev;
      const now = Date.now();
      const updated: Voucher = {
        ...voucher,
        status: 'active',
        validatedByAdult: true,
        validatedAt: now,
        activatedAt: now,
        expiresAt: now + voucher.minutes * 60 * 1000,
      };
      const next = {
        ...prev,
        vouchers: prev.vouchers.map(v => v.id === voucherId ? updated : v),
      };
      saveState(next);
      return next;
    });
  }, []);

  const handleMarkUsed = useCallback((voucherId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        vouchers: prev.vouchers.map(v =>
          v.id === voucherId ? { ...v, status: 'used' as const } : v,
        ),
      };
      saveState(next);
      return next;
    });
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <p className="text-2xl text-green-700">🌱 Carregant...</p>
      </div>
    );
  }

  if (!state.settings.parentPin) {
    return <PinSetupScreen onDone={handlePinSetup} />;
  }

  const activeVouchers = state.vouchers.filter(
    v => v.status === 'pending' || v.status === 'active',
  );

  return (
    <main className="min-h-screen bg-yellow-50">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <header className="text-center space-y-1">
          <h1 className="text-4xl font-extrabold text-green-900">
            El Jardí dels Números 🌱
          </h1>
          {state.streak.current > 0 && (
            <p className="text-xl text-amber-700 font-bold">
              🔥 {state.streak.current}{' '}
              {state.streak.current === 1 ? 'dia seguit' : 'dies seguits'}
            </p>
          )}
        </header>

        {/* Active vouchers */}
        {activeVouchers.length > 0 && (
          <section className="space-y-3">
            {activeVouchers.map(v => (
              <VoucherCard
                key={v.id}
                voucher={v}
                correctPin={state.settings.parentPin!}
                onValidate={handleValidateVoucher}
                onMarkUsed={handleMarkUsed}
              />
            ))}
          </section>
        )}

        {/* Garden */}
        <Garden facts={state.facts} tablesRange={state.settings.tablesRange} />

        {/* Start button */}
        <button
          onClick={() => router.push('/session')}
          className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-extrabold text-3xl py-6 rounded-3xl shadow-lg transition-all"
        >
          Comencem! 🌻
        </button>

        {/* Challenge button */}
        <button
          onClick={() => router.push('/challenge')}
          className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-2xl py-5 rounded-3xl shadow-md transition-all"
        >
          Repte a dos! 🎮
        </button>

        {/* Adults link */}
        <div className="text-center pt-2">
          <button
            onClick={() => router.push('/adults')}
            className="text-slate-400 text-base underline"
          >
            Zona de persones adultes
          </button>
        </div>

      </div>
    </main>
  );
}
