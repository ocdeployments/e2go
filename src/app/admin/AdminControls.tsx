'use client';

import { useState } from 'react';

interface Props {
  killSwitchOn: boolean;
  maintenanceOn: boolean;
}

export default function AdminControls({ killSwitchOn, maintenanceOn }: Props) {
  const [ks, setKs]   = useState(killSwitchOn);
  const [mm, setMm]   = useState(maintenanceOn);
  const [busy, setBusy] = useState(false);

  async function toggle(key: string, current: boolean, setter: (v: boolean) => void) {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: String(!current) }),
      });
      if (res.ok) setter(!current);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-3 flex-wrap mb-10">
      <ToggleBtn
        label="Kill Switch (AI off)"
        active={ks}
        danger
        disabled={busy}
        onToggle={() => toggle('kill_switch_enabled', ks, setKs)}
      />
      <ToggleBtn
        label="Maintenance Mode"
        active={mm}
        danger={false}
        disabled={busy}
        onToggle={() => toggle('maintenance_mode', mm, setMm)}
      />
      <a
        href="/admin/system-status"
        className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-xs text-zinc-400 hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-colors"
      >
        Full System Status →
      </a>
    </div>
  );
}

function ToggleBtn({
  label, active, danger, disabled, onToggle,
}: {
  label: string; active: boolean; danger: boolean; disabled: boolean; onToggle: () => void;
}) {
  const color = active
    ? (danger ? 'border-red-500/30 text-red-400 bg-red-950/20' : 'border-yellow-500/30 text-yellow-400 bg-yellow-950/20')
    : 'border-zinc-800 text-zinc-500 bg-transparent';

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 border text-xs font-medium transition-colors disabled:opacity-50 ${color}`}
    >
      <span className={`w-2.5 h-2.5 rounded-sm border ${active ? (danger ? 'border-red-400 bg-red-400' : 'border-yellow-400 bg-yellow-400') : 'border-zinc-600'}`} />
      {label}: {active ? 'ON' : 'OFF'}
    </button>
  );
}
