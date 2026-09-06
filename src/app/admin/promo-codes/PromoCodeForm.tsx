'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TIERS = [
  { value: 'complete',                   label: 'Complete ($1,495)' },
  { value: 'complete_partnership',       label: 'Complete — Partnership ($2,495)' },
  { value: 'interview_prep',             label: 'Interview Prep ($347)' },
  { value: 'interview_prep_partnership', label: 'Interview Prep — Partnership ($495)' },
  { value: 'fdd_intelligence',           label: 'FDD Intelligence ($575)' },
  { value: 'fdd_intelligence_loyalty',   label: 'FDD Intelligence Loyalty ($375)' },
  { value: 'simulator_3pack',            label: 'Simulator 3-Pack ($49)' },
  { value: 'renewal',                    label: 'Renewal ($99)' },
];

const DISCOUNTS = [25, 50, 75, 100];

export default function PromoCodeForm() {
  const router = useRouter();
  const [code, setCode]                     = useState('');
  const [codeType, setCodeType]             = useState<'shared' | 'personal'>('shared');
  const [assignedEmail, setAssignedEmail]   = useState('');
  const [discountPercent, setDiscountPercent] = useState(25);
  const [selectedTiers, setSelectedTiers]   = useState<string[]>([]);
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresAt, setExpiresAt]           = useState('');
  const [note, setNote]                     = useState('');
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState<{ ok: boolean; message: string } | null>(null);

  function toggleTier(value: string) {
    setSelectedTiers(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]);
  }

  function resetForm() {
    setCode('');
    setCodeType('shared');
    setAssignedEmail('');
    setDiscountPercent(25);
    setSelectedTiers([]);
    setMaxRedemptions('');
    setExpiresAt('');
    setNote('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          codeType,
          assignedEmail: codeType === 'personal' ? assignedEmail : undefined,
          discountPercent,
          applicableTiers: selectedTiers.length > 0 ? selectedTiers : undefined,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
          expiresAt: expiresAt || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; code?: string };
      if (data.ok) {
        setResult({ ok: true, message: `Created "${data.code}".` });
        resetForm();
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error ?? 'Unknown error' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error — could not create promo code.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-zinc-800 bg-zinc-900/40 p-5 mb-8">
      <p className="text-xs text-[#C9A84C] uppercase tracking-widest font-semibold mb-4">Create promo code</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Code</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="E.g. WELCOME25"
            required
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 uppercase focus:outline-none focus:border-[#C9A84C]/40 placeholder-zinc-700"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Type</label>
          <select
            value={codeType}
            onChange={e => setCodeType(e.target.value as 'shared' | 'personal')}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:border-[#C9A84C]/40"
          >
            <option value="shared">Shared (campaign code)</option>
            <option value="personal">Personal (one recipient only)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Discount</label>
          <select
            value={discountPercent}
            onChange={e => setDiscountPercent(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:border-[#C9A84C]/40"
          >
            {DISCOUNTS.map(d => <option key={d} value={d}>{d}% off</option>)}
          </select>
        </div>

        {codeType === 'personal' && (
          <div className="md:col-span-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">
              Recipient email — only this account can redeem
            </label>
            <input
              type="email"
              value={assignedEmail}
              onChange={e => setAssignedEmail(e.target.value)}
              placeholder="recipient@example.com"
              required={codeType === 'personal'}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:border-[#C9A84C]/40 placeholder-zinc-700"
            />
          </div>
        )}

        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">
            Max redemptions {codeType === 'personal' && '(personal codes are always 1)'}
          </label>
          <input
            type="number"
            min={1}
            value={codeType === 'personal' ? 1 : maxRedemptions}
            onChange={e => setMaxRedemptions(e.target.value)}
            disabled={codeType === 'personal'}
            placeholder="Blank = unlimited"
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:border-[#C9A84C]/40 placeholder-zinc-700 disabled:opacity-40"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Expires (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:border-[#C9A84C]/40"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Note (internal, optional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="E.g. Facebook group launch"
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:border-[#C9A84C]/40 placeholder-zinc-700"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">
          Applies to — leave all unchecked for every package
        </label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TIERS.map(t => (
            <label key={t.value} className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTiers.includes(t.value)}
                onChange={() => toggleTier(t.value)}
                className="accent-[#C9A84C]"
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="text-xs px-4 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-colors uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create code →'}
        </button>
        {result && (
          <span className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.message}</span>
        )}
      </div>
    </form>
  );
}
