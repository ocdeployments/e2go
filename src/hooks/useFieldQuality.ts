'use client';
import { useState, useCallback, useRef } from 'react';

export type FieldQuality = 'strong' | 'adequate' | 'needs_work' | 'too_short' | 'unknown' | 'checking';

export interface FieldQualityResult {
  quality: FieldQuality;
  wordCount?: number;
  feedback: string | null;
}

// Fields eligible for quality checks (must match FIELD_CRITERIA keys in /api/case-file/field-quality)
const QUALITY_CHECK_FIELDS = new Set([
  'M3-S1-01', 'M3-S1-02', 'M3-S1-03',
  'M3-Q-04', 'M3-B-MKT', 'M3-B-OPS',
  'M3-H-NEW-01', 'M3-K-TIES',
]);

export function useFieldQuality(businessType?: string) {
  const [qualityMap, setQualityMap] = useState<Record<string, FieldQualityResult>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const checkFieldQuality = useCallback(async (fieldKey: string, value: string) => {
    if (!QUALITY_CHECK_FIELDS.has(fieldKey)) return;
    if (!value?.trim() || value.trim().split(/\s+/).length < 15) return;
    if (inFlightRef.current.has(fieldKey)) return;

    inFlightRef.current.add(fieldKey);
    setQualityMap(prev => ({ ...prev, [fieldKey]: { quality: 'checking', feedback: null } }));

    try {
      const res = await fetch('/api/case-file/field-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKey, value, businessType }),
      });
      if (res.ok) {
        const result: FieldQualityResult = await res.json();
        setQualityMap(prev => ({ ...prev, [fieldKey]: result }));
      }
    } catch {
      // Fail silently — quality check is advisory only
    } finally {
      inFlightRef.current.delete(fieldKey);
    }
  }, [businessType]);

  return { qualityMap, checkFieldQuality };
}

// Render helper — returns inline badge JSX props
export function getQualityBadgeStyle(quality: FieldQuality): { color: string; label: string } | null {
  switch (quality) {
    case 'strong':     return { color: '#22c55e', label: 'Strong' };
    case 'adequate':   return { color: '#f59e0b', label: 'Good' };
    case 'needs_work': return { color: '#ef4444', label: 'Needs detail' };
    case 'too_short':  return { color: '#ef4444', label: 'Too short' };
    case 'checking':   return { color: 'rgba(245,240,232,0.3)', label: 'Checking…' };
    default:           return null;
  }
}
