'use client';

import { useState } from 'react';

const TIERS = [
  { value: 'complete',                  label: 'Complete ($1,495)' },
  { value: 'interview_prep',            label: 'Interview Prep add-on ($347)' },
  { value: 'fdd_intelligence',          label: 'FDD Intelligence ($575)' },
  { value: 'fdd_intelligence_loyalty',  label: 'FDD Intelligence Loyalty ($375)' },
  { value: 'simulator_3pack',           label: 'Simulator 3-Pack ($49)' },
  { value: 'renewal',                   label: 'Renewal ($99)' },
];

export default function TierOverridePanel({ userId, currentTier }: { userId: string; currentTier: string | null }) {
  const [selectedTier, setSelectedTier] = useState(currentTier ?? 'solo');
  const [note, setNote]                 = useState('');
  const [confirming, setConfirming]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<{ ok: boolean; message: string } | null>(null);

  async function handleOverride() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/tier-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, tier: selectedTier, note }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setResult({ ok: true, message: `Tier set to ${selectedTier}. A $0 payment record was inserted.` });
      } else {
        setResult({ ok: false, message: data.error ?? 'Unknown error' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error — tier override failed.' });
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <div className="border border-red-900/40 bg-red-950/10 p-5">
      <p className="text-xs text-red-400 uppercase tracking-widest font-semibold mb-4">Override Tier</p>
      <p className="text-xs text-zinc-500 mb-4">
        Inserts a $0 completed payment record granting access to the selected tier. Logged in admin_audit_log.
        Only use for support exceptions or test accounts.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">New tier</label>
          <select
            value={selectedTier}
            onChange={e => setSelectedTier(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:border-[#C9A84C]/40"
          >
            {TIERS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Reason for override..."
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:border-[#C9A84C]/40 placeholder-zinc-700"
          />
        </div>
      </div>

      {!confirming && !result && (
        <button
          onClick={() => setConfirming(true)}
          className="text-xs px-4 py-2 border border-red-700/50 text-red-400 hover:bg-red-900/20 transition-colors uppercase tracking-wider"
        >
          Override tier →
        </button>
      )}

      {confirming && !result && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-red-300">
            This will grant <span className="font-semibold">{selectedTier}</span> access to this user immediately. Are you sure?
          </p>
          <button
            onClick={handleOverride}
            disabled={loading}
            className="text-xs px-4 py-2 bg-red-900/30 border border-red-600/50 text-red-300 hover:bg-red-900/50 transition-colors uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Overriding…' : 'Yes, confirm'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-4 py-2 border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {result && (
        <div className={`text-xs px-4 py-2 border ${result.ok ? 'border-emerald-700/50 text-emerald-400 bg-emerald-900/10' : 'border-red-700/50 text-red-400 bg-red-900/10'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
