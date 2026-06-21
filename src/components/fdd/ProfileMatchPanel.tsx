'use client';

import { useState, useRef, useCallback } from 'react';
import type { ProfileMatchResult, ProfileMatchGrade } from '@/lib/fdd-profile-match-engine';
import type { FddExtractedFields } from '@/types/fdd';

// ============================================================================
// Config maps
// ============================================================================

const GRADE_CONFIG: Record<ProfileMatchGrade, { dot: string; label: string; color: string }> = {
  pass:    { dot: 'bg-emerald-400', label: 'Pass',    color: 'text-emerald-400' },
  viable:  { dot: 'bg-[#C9A84C]',  label: 'Viable',  color: 'text-[#C9A84C]' },
  caution: { dot: 'bg-amber-400',   label: 'Caution', color: 'text-amber-400' },
  fail:    { dot: 'bg-red-400',     label: 'Fail',    color: 'text-red-400' },
  unknown: { dot: 'bg-white/20',    label: 'Unknown', color: 'text-white/30' },
};

const OVERALL_CONFIG: Record<ProfileMatchResult['overall'], { label: string; color: string; border: string; bg: string }> = {
  STRONG_FIT:        { label: 'Strong Fit',        color: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/5'  },
  GOOD_FIT:          { label: 'Good Fit',          color: 'text-[#C9A84C]',  border: 'border-[#C9A84C]/30',  bg: 'bg-[#C9A84C]/5'   },
  PARTIAL_FIT:       { label: 'Partial Fit',       color: 'text-amber-400',  border: 'border-amber-400/30',  bg: 'bg-amber-400/5'   },
  POOR_FIT:          { label: 'Poor Fit',          color: 'text-red-400',    border: 'border-red-400/30',    bg: 'bg-red-400/5'     },
  INSUFFICIENT_DATA: { label: 'Insufficient Data', color: 'text-white/40',   border: 'border-white/10',      bg: 'bg-white/3'       },
};

const DIM_LABELS: Record<string, string> = {
  capital_adequacy:    'Capital Adequacy',
  e2_substantiality:   'E-2 Substantiality',
  role_alignment:      'Role Alignment',
  employment_creation: 'Employment Creation',
  net_worth_position:  'Net Worth Position',
};

// ============================================================================
// Per-dimension edit fields
// fieldType 'investor' → stored on fdd_analyses directly
// fieldType 'extracted' → stored in extracted_fields JSONB
// ============================================================================

type EditFieldDef = {
  key: string;
  label: string;
  inputType: 'number' | 'select' | 'text';
  prefix?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  fieldType: 'investor' | 'extracted';
  investorKey?: 'liquidCapital' | 'netWorth';
  extractedKey?: keyof FddExtractedFields;
  storeAs?: 'string' | 'number';
};

const DIM_FIELDS: Record<string, EditFieldDef[]> = {
  capital_adequacy: [
    { key: 'liquidCapital', label: 'Your liquid capital available to invest (USD)',
      inputType: 'number', prefix: '$', placeholder: '250000',
      fieldType: 'investor', investorKey: 'liquidCapital' },
  ],
  e2_substantiality: [
    { key: 'liquidCapital', label: 'Your liquid capital (USD)',
      inputType: 'number', prefix: '$', placeholder: '250000',
      fieldType: 'investor', investorKey: 'liquidCapital' },
    { key: 'netWorth', label: 'Your total net worth (USD)',
      inputType: 'number', prefix: '$', placeholder: '600000',
      fieldType: 'investor', investorKey: 'netWorth' },
  ],
  role_alignment: [
    { key: 'investor_role', label: 'Investor management model (from Item 11)',
      inputType: 'select', fieldType: 'extracted', extractedKey: 'investor_role', storeAs: 'string',
      options: [
        { value: 'Active owner-operator', label: 'Active owner-operator (full-time)' },
        { value: 'semi-absentee', label: 'Semi-absentee (part-time oversight)' },
        { value: 'absentee', label: 'Absentee / passive investor' },
      ] },
    { key: 'investor_hours_per_week', label: 'Hours per week (from Item 11)',
      inputType: 'number', placeholder: '40',
      fieldType: 'extracted', extractedKey: 'investor_hours_per_week', storeAs: 'number' },
  ],
  employment_creation: [
    { key: 'typical_fte_employees', label: 'Typical FTE employees at this franchise (from Item 11)',
      inputType: 'number', placeholder: '5',
      fieldType: 'extracted', extractedKey: 'typical_fte_employees', storeAs: 'number' },
  ],
  net_worth_position: [
    { key: 'netWorth', label: 'Your total net worth (USD)',
      inputType: 'number', prefix: '$', placeholder: '600000',
      fieldType: 'investor', investorKey: 'netWorth' },
  ],
};

// ============================================================================
// Props
// ============================================================================

export interface ProfileMatchPanelProps {
  match: ProfileMatchResult;
  localLiquidCapital: number | null;
  localNetWorth: number | null;
  localExtractedFields: FddExtractedFields;
  onLiquidCapitalChange: (v: number | null) => void;
  onNetWorthChange: (v: number | null) => void;
  onExtractedFieldChange: (key: keyof FddExtractedFields, value: string | number) => void;
  onSaveLiquidCapital: (v: number | null) => Promise<void>;
  onSaveNetWorth: (v: number | null) => Promise<void>;
  onSaveExtractedField: (key: keyof FddExtractedFields, value: string | number) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export default function ProfileMatchPanel({
  match,
  localLiquidCapital,
  localNetWorth,
  localExtractedFields,
  onLiquidCapitalChange,
  onNetWorthChange,
  onExtractedFieldChange,
  onSaveLiquidCapital,
  onSaveNetWorth,
  onSaveExtractedField,
}: ProfileMatchPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cfg = OVERALL_CONFIG[match.overall];

  const dimEntries = Object.entries(match.dimensions) as Array<
    [string, ProfileMatchResult['dimensions'][keyof ProfileMatchResult['dimensions']]]
  >;

  // Read current value for a field definition
  const getFieldValue = useCallback((f: EditFieldDef): string => {
    if (f.investorKey === 'liquidCapital') return localLiquidCapital !== null ? String(localLiquidCapital) : '';
    if (f.investorKey === 'netWorth') return localNetWorth !== null ? String(localNetWorth) : '';
    if (f.extractedKey) {
      const v = localExtractedFields[f.extractedKey]?.value;
      return v !== null && v !== undefined ? String(v) : '';
    }
    return '';
  }, [localLiquidCapital, localNetWorth, localExtractedFields]);

  const handleChange = useCallback((f: EditFieldDef, raw: string) => {
    // Optimistic update — triggers live rescore in parent
    if (f.investorKey === 'liquidCapital') {
      onLiquidCapitalChange(raw === '' ? null : Number(raw.replace(/[^0-9.]/g, '')));
    } else if (f.investorKey === 'netWorth') {
      onNetWorthChange(raw === '' ? null : Number(raw.replace(/[^0-9.]/g, '')));
    } else if (f.extractedKey) {
      const parsed: string | number = (f.storeAs === 'number' && raw !== '') ? Number(raw) : raw;
      onExtractedFieldChange(f.extractedKey, parsed);
    }

    // Debounced DB save
    const dKey = f.key;
    const existing = debounceRefs.current.get(dKey);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        if (f.investorKey === 'liquidCapital') {
          await onSaveLiquidCapital(raw === '' ? null : Number(raw.replace(/[^0-9.]/g, '')));
        } else if (f.investorKey === 'netWorth') {
          await onSaveNetWorth(raw === '' ? null : Number(raw.replace(/[^0-9.]/g, '')));
        } else if (f.extractedKey) {
          const parsed: string | number = (f.storeAs === 'number' && raw !== '') ? Number(raw) : raw;
          await onSaveExtractedField(f.extractedKey, parsed);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch {
        setSaveStatus('idle');
      }
    }, 800);
    debounceRefs.current.set(dKey, timer);
  }, [onLiquidCapitalChange, onNetWorthChange, onExtractedFieldChange, onSaveLiquidCapital, onSaveNetWorth, onSaveExtractedField]);

  return (
    <div className="space-y-4">

      {/* Overall fit card */}
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 flex items-center justify-between`}>
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Your Profile vs This Franchise</p>
          <p className={`font-['Cormorant_Garamond'] text-2xl font-light ${cfg.color}`}>{cfg.label}</p>
          <p className="text-white/50 text-xs mt-2 leading-relaxed max-w-sm">{match.recommendation}</p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className={`text-3xl font-light ${cfg.color}`}>{match.fit_score}</p>
          <p className="text-white/30 text-xs">/100 fit score</p>
        </div>
      </div>

      {/* Dimension cards */}
      <div className="space-y-2">
        {dimEntries.map(([key, dim]) => {
          const gcfg = GRADE_CONFIG[dim.result];
          const isOpen = expanded === key;
          const editFields = DIM_FIELDS[key] ?? [];
          const showEdit = dim.result !== 'pass' && editFields.length > 0;

          return (
            <div key={key} className="border border-white/8 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : key)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${gcfg.dot}`} />
                  <span className="text-white/70 text-xs font-medium">{DIM_LABELS[key] ?? dim.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className={`text-xs font-medium ${gcfg.color}`}>{gcfg.label}</span>
                  <span className={`text-white/25 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/8 px-5 py-4 space-y-3" onClick={e => e.stopPropagation()}>
                  {/* Existing dimension read-out */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/30 text-xs mb-0.5">You have</p>
                      <p className="text-white text-sm">{dim.investor_value}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-xs mb-0.5">Required</p>
                      <p className="text-white text-sm">{dim.requirement}</p>
                    </div>
                  </div>
                  {dim.gap && (
                    <div className="bg-amber-400/8 border border-amber-400/20 rounded-lg px-3 py-2">
                      <p className="text-amber-400 text-xs">Gap: {dim.gap}</p>
                    </div>
                  )}
                  <p className="text-white/40 text-xs leading-relaxed">{dim.note}</p>

                  {/* Inline edit panel */}
                  {showEdit && (
                    <div className="pt-3 border-t border-white/8 space-y-3">
                      <p className="text-white/30 text-[10px] uppercase tracking-widest">
                        {dim.result === 'unknown' ? 'Provide this data to score dimension' : 'Update your profile data'}
                      </p>
                      {editFields.map(f => (
                        <div key={f.key}>
                          <label className="block text-white/40 text-xs mb-1.5">{f.label}</label>
                          {f.inputType === 'select' ? (
                            <select
                              value={getFieldValue(f)}
                              onChange={e => handleChange(f, e.target.value)}
                              className="w-full bg-white/5 border border-white/12 text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-[#C9A84C]/40 cursor-pointer"
                            >
                              <option value="">Select…</option>
                              {f.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="relative">
                              {f.prefix && (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs pointer-events-none">
                                  {f.prefix}
                                </span>
                              )}
                              <input
                                type="text"
                                inputMode="numeric"
                                value={getFieldValue(f)}
                                onChange={e => handleChange(f, e.target.value)}
                                placeholder={f.placeholder}
                                className={`w-full bg-white/5 border border-white/12 text-white text-xs py-2 rounded-lg outline-none focus:border-[#C9A84C]/40 ${f.prefix ? 'pl-6 pr-3' : 'px-3'}`}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      {saveStatus !== 'idle' && (
                        <p className={`text-[10px] ${saveStatus === 'saved' ? 'text-emerald-400' : 'text-white/30'}`}>
                          {saveStatus === 'saving' ? 'Saving…' : '✓ Saved to your profile'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
