'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PromoCodeRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        router.refresh();
      } else {
        setErrorMsg(data.error ?? 'Failed');
      }
    } catch {
      setErrorMsg('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {errorMsg && <span className="text-[10px] text-red-400">{errorMsg}</span>}
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-[10px] px-2.5 py-1 border uppercase tracking-wider transition-colors disabled:opacity-50 ${
          active
            ? 'border-red-700/50 text-red-400 hover:bg-red-900/20'
            : 'border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/20'
        }`}
      >
        {loading ? '…' : active ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}
