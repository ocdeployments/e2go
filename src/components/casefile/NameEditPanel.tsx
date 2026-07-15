'use client';

import { useState } from 'react';
import { GOLD, CREAM } from '@/components/casefile/tokens';

interface NameEditPanelProps {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  onSaved: (name: { firstName: string; middleName: string | null; lastName: string }) => void;
}

export default function NameEditPanel({ firstName, middleName, lastName, onSaved }: NameEditPanelProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: firstName ?? '', middleName: middleName ?? '', lastName: lastName ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleOpen() {
    if (!open) setForm({ firstName: firstName ?? '', middleName: middleName ?? '', lastName: lastName ?? '' });
    setError(null);
    setOpen((v) => !v);
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim() || null,
          lastName: form.lastName.trim(),
        }),
      });
      if (res.ok) {
        const updated = await res.json() as { firstName: string; middleName: string | null; lastName: string };
        onSaved(updated);
        setOpen(false);
      } else {
        setError('Could not save — please try again.');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={toggleOpen}
          style={{
            fontSize: '9px',
            letterSpacing: '0.1em',
            color: 'rgba(201,168,76,0.6)',
            background: 'transparent',
            border: '1px solid rgba(201,168,76,0.2)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            textTransform: 'uppercase',
          }}
        >
          {open ? 'Close' : 'Edit Name'}
        </button>
      </div>

      {open && (
        <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}>
            Edit Name
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {([
              { label: 'First Name *', key: 'firstName' as const },
              { label: 'Middle Name', key: 'middleName' as const },
              { label: 'Last Name *', key: 'lastName' as const },
            ]).map(({ label, key }) => (
              <div key={key}>
                <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '4px' }}>
                  {label}
                </div>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', color: CREAM, padding: '7px 10px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          {error && <div style={{ fontSize: '11px', color: '#f87171', fontFamily: "'DM Sans', sans-serif", marginBottom: '8px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 18px', background: GOLD, color: '#0a0a0a', fontSize: '10px', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null); }}
              style={{ padding: '8px 14px', background: 'transparent', color: 'rgba(245,240,232,0.38)', fontSize: '10px', fontFamily: "'DM Sans', sans-serif", border: '1px solid rgba(245,240,232,0.1)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
