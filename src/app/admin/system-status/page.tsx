'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceStatus { status: 'ok' | 'error' | 'warn'; latency_ms?: number; last_webhook_hours_ago?: number | null }
interface StuckJob { id: string; application_id: string; current_step_label: string; created_at: string; updated_at: string }
interface ActiveJob { id: string; application_id: string; current_step: number; total_steps: number; current_step_label: string; updated_at: string }
interface CronEntry { started_at: string; status: string; error?: string | null }
interface HealthDetail {
  timestamp: string;
  services: { database: ServiceStatus; openrouter: ServiceStatus; stripe: ServiceStatus };
  generation: { active_jobs: ActiveJob[]; stuck_jobs: StuckJob[]; stuck_count: number };
  crons: Record<string, CronEntry>;
  llm: { latency_p95_ms: number | null; latency_avg_ms: number | null; recent_calls: number };
  settings: { kill_switch_enabled: boolean; maintenance_mode: boolean; kill_switch_message: string };
}

const STATUS_COLOR = { ok: '#4ade80', warn: '#fbbf24', error: '#f87171' };
const STATUS_LABEL = { ok: 'Operational', warn: 'Degraded', error: 'Down' };

function ServiceCard({ name, s }: { name: string; s: ServiceStatus }) {
  const color = STATUS_COLOR[s.status];
  return (
    <div style={{ border: `1px solid ${color}22`, padding: '14px 16px', background: `${color}08` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#f5f0e8', fontFamily: 'monospace' }}>{name}</span>
        <span style={{ fontSize: 9, color, fontWeight: 700, marginLeft: 'auto' }}>{STATUS_LABEL[s.status]}</span>
      </div>
      {s.latency_ms != null && (
        <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)' }}>Latency: {s.latency_ms}ms</div>
      )}
      {s.last_webhook_hours_ago != null && (
        <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)' }}>Last webhook: {s.last_webhook_hours_ago}h ago</div>
      )}
    </div>
  );
}

export default function SystemStatusPage() {
  const [data, setData]       = useState<HealthDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<string>('');
  const [forcing, setForcing] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health-detail');
      if (res.ok) {
        setData(await res.json());
        setLastFetch(new Date().toLocaleTimeString());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 30_000);
    return () => clearInterval(id);
  }, [fetch_]);

  async function forceFailJob(jobId: string) {
    setForcing(jobId);
    await fetch('/api/admin/stuck-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    await fetch_();
    setForcing(null);
  }

  async function toggle(key: 'kill_switch_enabled' | 'maintenance_mode', current: boolean) {
    setToggling(true);
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: String(!current) }),
    });
    await fetch_();
    setToggling(false);
  }

  const s = { fontSize: 10, color: 'rgba(245,240,232,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 700, marginBottom: 12, marginTop: 28, borderBottom: '1px solid rgba(201,168,76,0.1)', paddingBottom: 8 };

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8', padding: '40px 28px' }}>
      <div style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>Loading health data…</div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8', padding: '32px 28px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#C9A84C', margin: 0 }}>System Status</h1>
        <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)' }}>Auto-refreshes every 30s · Last: {lastFetch}</span>
        <a href="/admin" style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>← Admin</a>
      </div>

      {/* Controls */}
      {data && (
        <>
          <div style={s}>System Controls</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <ToggleButton
              label="Kill Switch (AI off)"
              active={data.settings.kill_switch_enabled}
              danger
              disabled={toggling}
              onToggle={() => toggle('kill_switch_enabled', data.settings.kill_switch_enabled)}
            />
            <ToggleButton
              label="Maintenance Mode"
              active={data.settings.maintenance_mode}
              danger={false}
              disabled={toggling}
              onToggle={() => toggle('maintenance_mode', data.settings.maintenance_mode)}
            />
          </div>
          {data.settings.kill_switch_enabled && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 11, color: '#f87171' }}>
              AI features are OFF — all LLM calls will return null. Users see: &quot;{data.settings.kill_switch_message}&quot;
            </div>
          )}

          {/* Services */}
          <div style={s}>Services</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, marginBottom: 8 }}>
            <ServiceCard name="Supabase DB"  s={data.services.database}   />
            <ServiceCard name="OpenRouter"   s={data.services.openrouter} />
            <ServiceCard name="Stripe"       s={data.services.stripe}     />
          </div>

          {/* LLM stats */}
          <div style={s}>LLM Performance (last 100 calls)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 8 }}>
            {[
              { label: 'Latency avg', value: data.llm.latency_avg_ms ? `${data.llm.latency_avg_ms}ms` : '—' },
              { label: 'Latency p95', value: data.llm.latency_p95_ms ? `${data.llm.latency_p95_ms}ms` : '—' },
              { label: 'Calls sampled', value: String(data.llm.recent_calls) },
            ].map(m => (
              <div key={m.label} style={{ border: '1px solid rgba(201,168,76,0.1)', padding: '12px 14px' }}>
                <div style={{ fontSize: 9, color: 'rgba(245,240,232,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 22, color: '#C9A84C', fontFamily: "'Cormorant Garamond',serif" }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Generation jobs */}
          <div style={s}>Generation Pipeline</div>
          {data.generation.active_jobs.length === 0 && data.generation.stuck_jobs.length === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.3)', padding: '8px 0' }}>No active generation jobs.</div>
          )}
          {data.generation.active_jobs.map(job => (
            <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(201,168,76,0.06)', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ color: 'rgba(245,240,232,0.7)', flex: 1 }}>Step {job.current_step}/{job.total_steps} — {job.current_step_label}</span>
              <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 10 }}>{job.application_id.slice(0, 8)}</span>
            </div>
          ))}
          {data.generation.stuck_jobs.map(job => (
            <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(220,38,38,0.1)' }}>
              <span style={{ width: 8, height: 8, background: '#f87171', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#f87171' }}>STUCK — {job.current_step_label}</div>
                <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>App: {job.application_id.slice(0, 8)} · Last update: {new Date(job.updated_at).toLocaleTimeString()}</div>
              </div>
              <button
                onClick={() => forceFailJob(job.id)}
                disabled={forcing === job.id}
                style={{ fontSize: 10, color: '#f87171', border: '1px solid rgba(220,38,38,0.3)', background: 'transparent', padding: '4px 10px', cursor: 'pointer' }}
              >
                {forcing === job.id ? 'Failing…' : 'Force Fail'}
              </button>
            </div>
          ))}

          {/* Cron jobs */}
          <div style={s}>Cron Jobs</div>
          {Object.entries(data.crons).length === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.3)', padding: '8px 0' }}>No cron history yet (cron_log table is empty).</div>
          )}
          {Object.entries(data.crons).map(([name, entry]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(201,168,76,0.05)', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, background: entry.status === 'success' ? '#4ade80' : '#f87171', borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ color: '#f5f0e8', fontFamily: 'monospace', fontSize: 11 }}>{name}</span>
              <span style={{ color: 'rgba(245,240,232,0.4)', flex: 1 }}>{new Date(entry.started_at).toLocaleString()}</span>
              <span style={{ color: entry.status === 'success' ? '#4ade80' : '#f87171', fontSize: 10, fontWeight: 700 }}>{entry.status}</span>
              {entry.error && <span style={{ fontSize: 10, color: '#f87171', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.error}>{entry.error}</span>}
            </div>
          ))}
        </>
      )}
    </main>
  );
}

function ToggleButton({ label, active, danger, disabled, onToggle }: {
  label: string; active: boolean; danger: boolean; disabled: boolean; onToggle: () => void;
}) {
  const color = active ? (danger ? '#f87171' : '#4ade80') : 'rgba(245,240,232,0.3)';
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        border: `1px solid ${color}44`, background: `${color}08`, cursor: 'pointer',
        color, fontSize: 12, fontWeight: 600,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 2, background: active ? color : 'transparent', border: `1px solid ${color}`, display: 'inline-block' }} />
      {label}: {active ? 'ON' : 'OFF'}
    </button>
  );
}
