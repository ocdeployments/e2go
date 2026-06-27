'use client';

import { useState } from 'react';

export default function FlagUserPanel({ userId, isFlagged, flagReason }: {
  userId: string;
  isFlagged: boolean;
  flagReason: string | null;
}) {
  const [flagged, setFlagged]   = useState(isFlagged);
  const [reason, setReason]     = useState(flagReason ?? '');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<{ ok: boolean; message: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleToggle() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/flag-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, flagged: !flagged, reason: !flagged ? reason : undefined }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setFlagged(f => !f);
        setResult({ ok: true, message: flagged ? 'Flag removed.' : 'Account flagged for review.' });
        setConfirming(false);
      } else {
        setResult({ ok: false, message: data.error ?? 'Failed.' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      {flagged ? (
        <div className="border border-red-500/20 p-3 mb-2">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-red-400 font-medium uppercase tracking-widest">⚑ Flagged for review</span>
            {flagReason && <span className="text-xs text-zinc-500">{flagReason}</span>}
          </div>
          <button
            onClick={() => { setConfirming(true); }}
            className="text-xs text-zinc-500 border border-zinc-800 px-3 py-1 hover:border-zinc-600"
          >
            Remove flag
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-xs px-3 py-1.5 border border-zinc-800 text-zinc-500 hover:border-red-500/30 hover:text-red-400 transition-colors"
        >
          ⚑ Flag for review
        </button>
      )}

      {confirming && (
        <div className="border border-zinc-800 p-4 mt-3 space-y-3">
          <p className="text-xs text-zinc-400">
            {flagged ? 'Remove the review flag from this account?' : 'Flag this account for review.'}
          </p>
          {!flagged && (
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason (e.g. suspected abuse, duplicate account)"
              className="w-full bg-transparent border border-zinc-800 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-[#C9A84C]/30"
            />
          )}
          {result && (
            <p className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.message}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleToggle}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium border disabled:opacity-40"
              style={{ borderColor: flagged ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)', color: flagged ? '#4ade80' : '#ef4444' }}
            >
              {loading ? 'Saving…' : flagged ? 'Remove flag' : 'Confirm flag'}
            </button>
            <button onClick={() => setConfirming(false)} className="px-4 py-1.5 text-xs text-zinc-500 border border-zinc-800">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
