'use client';

import { useState } from 'react';

export default function SendEmailPanel({ userId }: { userId: string }) {
  const [subject, setSubject]   = useState('');
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<{ ok: boolean; message: string } | null>(null);
  const [open, setOpen]         = useState(false);

  async function handleSend() {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setResult({ ok: true, message: 'Email sent.' });
        setSubject('');
        setMessage('');
        setOpen(false);
      } else {
        setResult({ ok: false, message: data.error ?? 'Failed to send email.' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-3 py-1.5 border border-zinc-700 text-zinc-400 hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-colors"
        >
          Send Email to User
        </button>
      ) : (
        <div className="border border-zinc-800 p-4 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Send Email</p>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full bg-transparent border border-zinc-800 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-[#C9A84C]/30"
          />
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message body..."
            rows={4}
            className="w-full bg-transparent border border-zinc-800 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-[#C9A84C]/30 resize-none"
          />
          {result && (
            <p className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.message}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={loading || !subject.trim() || !message.trim()}
              className="px-4 py-1.5 text-xs font-medium disabled:opacity-40"
              style={{ background: '#C9A84C', color: '#0a0a0a' }}
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
            <button onClick={() => { setOpen(false); setResult(null); }} className="px-4 py-1.5 text-xs text-zinc-500 border border-zinc-800">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
