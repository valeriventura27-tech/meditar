'use client';
import { useEffect, useState } from 'react';
import type { Voucher } from '@/lib/types';
import { PinInput } from './PinInput';

interface Props {
  voucher: Voucher;
  correctPin: string;
  onValidate: (voucherId: string) => void;
  onMarkUsed: (voucherId: string) => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

export function VoucherCard({ voucher, correctPin, onValidate, onMarkUsed }: Props) {
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (voucher.status !== 'active' || !voucher.expiresAt) return;
    const tick = () => setTimeLeft(voucher.expiresAt! - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [voucher]);

  const handlePin = (pin: string) => {
    if (pin === correctPin) {
      setPinError(false);
      setShowPin(false);
      onValidate(voucher.id);
    } else {
      setPinError(true);
    }
  };

  const statusLabel: Record<Voucher['status'], string> = {
    pending: '⏳ Pendent de validació',
    active: '✅ Actiu',
    used: '✔ Usat',
    expired: '⌛ Caducat',
  };

  return (
    <div className="rounded-3xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-6 space-y-4 shadow-md">
      <div className="text-center">
        <p className="text-4xl">🎟️</p>
        <h3 className="text-2xl font-bold text-green-800 mt-2">
          Val d&apos;{voucher.minutes} min de tablet
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {statusLabel[voucher.status]}
        </p>
      </div>

      {voucher.status === 'active' && timeLeft !== null && (
        <div className="text-center bg-green-100 rounded-2xl py-3">
          <p className="text-lg text-green-700 font-semibold">Temps restant</p>
          <p className="text-3xl font-bold text-green-900">
            {timeLeft > 0 ? formatTime(timeLeft) : 'Caducat!'}
          </p>
        </div>
      )}

      {voucher.status === 'pending' && !showPin && (
        <div className="text-center space-y-3">
          <p className="text-slate-600 text-base">
            Un adult ha de validar el val
          </p>
          <button
            onClick={() => setShowPin(true)}
            className="bg-green-600 text-white font-bold py-3 px-8 rounded-2xl text-lg hover:bg-green-700 transition-colors"
          >
            Escriu el PIN
          </button>
        </div>
      )}

      {voucher.status === 'pending' && showPin && (
        <div className="space-y-3">
          <p className="text-center text-slate-600 text-sm">
            Zona de persones adultes — introduïu el PIN
          </p>
          <PinInput
            onComplete={handlePin}
            errorMessage={pinError ? 'PIN incorrecte. Torna-ho a provar.' : undefined}
          />
          <button
            onClick={() => { setShowPin(false); setPinError(false); }}
            className="w-full text-slate-400 text-sm underline"
          >
            Cancel·lar
          </button>
        </div>
      )}

      {voucher.status === 'active' && (
        <button
          onClick={() => onMarkUsed(voucher.id)}
          className="w-full bg-slate-100 text-slate-600 font-semibold py-3 rounded-2xl hover:bg-slate-200 transition-colors"
        >
          Marcar com a usat
        </button>
      )}
    </div>
  );
}
