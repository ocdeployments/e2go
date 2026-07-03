// ============================================================================
// FDD Intelligence — Shared ODE (Owner's Discretionary Earnings) constants
// ============================================================================
// Single source of truth for the non-marginality ODE pass/warn/fail
// thresholds and the AUV-based proxy formula. Used by both the full
// waterfall (fdd-scoring-engine.ts, which has fee/rent/labor/debt field
// data) and the territory market-sizing fallback (fdd-territory-engine.ts,
// which only has AUV and approximates off it). Previously each file
// hardcoded its own copy of $65K/$40K and its own margin assumption —
// this module exists so they can't drift apart again.

export const ODE_PASS_THRESHOLD = 65_000;
export const ODE_WARN_THRESHOLD = 40_000;

// Proxy margin: when full waterfall inputs (fees, rent, labor, debt service)
// aren't available, approximate ODE as this fraction of AUV. This is an
// internal calibration against the full waterfall's typical output for
// mid-market franchise economics — not a citation to external research.
export const ODE_PROXY_MARGIN_PCT = 0.35;

export function classifyOde(odeMid: number): 'pass' | 'warn' | 'fail' {
  if (odeMid > ODE_PASS_THRESHOLD) return 'pass';
  if (odeMid > ODE_WARN_THRESHOLD) return 'warn';
  return 'fail';
}

export function computeOdeProxy(auv: number): number {
  return Math.round(auv * ODE_PROXY_MARGIN_PCT);
}

export interface OdeAssumption {
  field: string;
  label: string;
  used_value: string;
  source: 'extracted' | 'assumed';
}
