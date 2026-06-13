'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  PreGenerationValidationResult,
  InvestmentLineItem,
} from '@/lib/pre-generation-validation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditRecord {
  field: string;
  oldValue: number | null;
  newValue: number;
}

interface DiscrepancyState {
  active: boolean;
  editedField: string;
  editedLabel: string;
  editedValue: number;
  originalTotal: number;
  /** Whether pushback has already been used for this field */
  used: boolean;
}

interface Props {
  validation: PreGenerationValidationResult;
  businessName: string | null;
  applicationId: string;
  onConfirm: (payload: {
    breakdown: Record<string, number>;
    fundSources: Record<string, number | null>;
    edits: EditRecord[];
    discrepancyPrompted: boolean;
    discrepancyResolution: 'total_updated' | 're_entered_line_item' | null;
  }) => void;
  onNeedsFixing: (returnTab: string, instruction: string) => void;
}

// ---------------------------------------------------------------------------
// Copy — per Spec1 Tone Principle: "a consultant double-checking"
// Never error messages, never accusatory.
// ---------------------------------------------------------------------------

const INTRO_COPY = {
  heading: "Let’s make sure we have your investment exactly right",
  subtext: "Every document we write will use these exact figures. If anything here is off — even by a small amount — fixing it now is much easier than fixing it across six documents later.",
};

const CONFIRM_LABEL = "Confirm — this is correct →";
const NEEDS_FIXING_LABEL = "Something needs fixing";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreGenerationConfirmation({
  validation,
  businessName,
  applicationId: _applicationId,
  onConfirm,
  onNeedsFixing,
}: Props) {
  // Editable breakdown amounts — keyed by line item key
  const [editableAmounts, setEditableAmounts] = useState<Record<string, number>>(
    () => Object.fromEntries(
      validation.investmentBreakdown.lineItems
        .filter((item): item is InvestmentLineItem & { amount: number } => item.amount !== null)
        .map((item) => [item.key, item.amount])
    )
  );

  // Edit tracking
  const [edits, setEdits] = useState<EditRecord[]>([]);

  // Discrepancy pushback state
  const [discrepancy, setDiscrepancy] = useState<DiscrepancyState>({
    active: false,
    editedField: '',
    editedLabel: '',
    editedValue: 0,
    originalTotal: validation.investmentBreakdown.totalInvested ?? 0,
    used: false,
  });

  // Track which fields have had pushback (one-round limit)
  const [pushedBackFields, setPushedBackFields] = useState<Set<string>>(new Set());

  // Whether discrepancy has been resolved
  const [discrepancyResolved, setDiscrepancyResolved] = useState(false);

  // Current total being displayed (may be updated after pushback)
  const [displayedTotal, setDisplayedTotal] = useState(
    validation.investmentBreakdown.totalInvested ?? 0
  );

  // Compute live sum
  const currentSum = useMemo(() => {
    return Object.values(editableAmounts).reduce((sum, amt) => sum + amt, 0);
  }, [editableAmounts]);

  // Whether the sum matches the total (within $1 tolerance)
  const sumMatchesTotal = useMemo(() => {
    return Math.abs(currentSum - displayedTotal) <= 1;
  }, [currentSum, displayedTotal]);

  // Confirm button should be disabled if:
  // 1. Sum doesn't match total AND discrepancy hasn't been resolved
  // 2. Discrepancy pushback is currently active (awaiting user response)
  const confirmDisabled = (!sumMatchesTotal && !discrepancyResolved) || discrepancy.active;

  // Handle inline edit
  const handleEdit = useCallback((fieldKey: string, newValue: string) => {
    const numValue = parseFloat(newValue.replace(/[$,]/g, ''));
    if (isNaN(numValue)) return;

    const oldValue = editableAmounts[fieldKey];
    if (oldValue === numValue) return;

    // Record the edit
    setEdits((prev) => {
      const filtered = prev.filter((e) => e.field !== fieldKey);
      return [...filtered, { field: fieldKey, oldValue: oldValue ?? null, newValue: numValue }];
    });

    // Update the amount
    setEditableAmounts((prev) => ({ ...prev, [fieldKey]: numValue }));

    // Check if this edit breaks consistency
    const otherItemsSum = Object.entries(editableAmounts)
      .filter(([k]) => k !== fieldKey)
      .reduce((sum, [, v]) => sum + v, 0);
    const newSum = otherItemsSum + numValue;
    const breaksConsistency = Math.abs(newSum - displayedTotal) > 1;

    if (breaksConsistency && !pushedBackFields.has(fieldKey)) {
      // Show discrepancy pushback
      const lineItem = validation.investmentBreakdown.lineItems.find((l) => l.key === fieldKey);
      setDiscrepancy({
        active: true,
        editedField: fieldKey,
        editedLabel: lineItem?.label ?? fieldKey,
        editedValue: numValue,
        originalTotal: displayedTotal,
        used: false,
      });
      setDiscrepancyResolved(false);
    } else if (!breaksConsistency) {
      // Edit maintained consistency — clear any active discrepancy
      setDiscrepancy((prev) => ({ ...prev, active: false }));
      setDiscrepancyResolved(true);
    }
  }, [editableAmounts, displayedTotal, pushedBackFields, validation.investmentBreakdown.lineItems]);

  // Handle discrepancy resolution: "Yes, update my total"
  const handleAcceptNewTotal = useCallback(() => {
    const newTotal = currentSum;
    setDisplayedTotal(newTotal);
    setDiscrepancyResolved(true);
    setDiscrepancy((prev) => ({ ...prev, active: false, used: true }));
    setPushedBackFields((prev) => new Set([...prev, discrepancy.editedField]));
  }, [currentSum, discrepancy.editedField]);

  // Handle discrepancy resolution: "No, I meant a different number"
  const handleRevertEdit = useCallback(() => {
    // Revert the edited field to its original value
    const originalValue = edits.find((e) => e.field === discrepancy.editedField)?.oldValue;
    if (originalValue !== null && originalValue !== undefined) {
      setEditableAmounts((prev) => ({ ...prev, [discrepancy.editedField]: originalValue }));
      setEdits((prev) => prev.filter((e) => e.field !== discrepancy.editedField));
    }
    setDiscrepancy((prev) => ({ ...prev, active: false, used: true }));
    setPushedBackFields((prev) => new Set([...prev, discrepancy.editedField]));
    setDiscrepancyResolved(false);
  }, [edits, discrepancy.editedField]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (confirmDisabled) return;

    const breakdown: Record<string, number> = {};
    for (const item of validation.investmentBreakdown.lineItems) {
      const amt = editableAmounts[item.key];
      if (amt !== undefined) {
        breakdown[item.key] = amt;
      }
    }

    const fundSources: Record<string, number | null> = {};
    for (const src of validation.fundSources.sources) {
      fundSources[src.key] = src.amount;
    }

    onConfirm({
      breakdown,
      fundSources,
      edits,
      discrepancyPrompted: discrepancy.used || discrepancy.active,
      discrepancyResolution: discrepancyResolved ? 'total_updated' : edits.length > 0 ? 're_entered_line_item' : null,
    });
  }, [
    confirmDisabled,
    validation.investmentBreakdown.lineItems,
    validation.fundSources.sources,
    editableAmounts,
    edits,
    discrepancy,
    discrepancyResolved,
    onConfirm,
  ]);

  // Handle "Something needs fixing"
  const handleNeedsFixing = useCallback(() => {
    // Find the most relevant tab to return to
    const gaps = validation.blockingGaps;
    if (gaps.length > 0) {
      onNeedsFixing(gaps[0].returnTab ?? '/apply/investment', gaps[0].instruction ?? '');
    } else {
      onNeedsFixing('/apply/investment', 'Please review your investment details.');
    }
  }, [validation.blockingGaps, onNeedsFixing]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-3xl md:text-4xl font-light tracking-tight mb-4"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#f5f0e8' }}
          >
            {INTRO_COPY.heading}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,240,232,0.65)' }}>
            {INTRO_COPY.subtext}
          </p>
          {businessName && (
            <p className="text-xs mt-3" style={{ color: 'rgba(245,240,232,0.45)' }}>
              {businessName}
            </p>
          )}
        </div>

        {/* Investment Breakdown Section */}
        <div className="mb-8">
          <h2
            className="text-lg font-light tracking-wide mb-4 uppercase"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: '#C9A84C',
              fontSize: '13px',
              letterSpacing: '0.1em',
            }}
          >
            Investment Breakdown
          </h2>

          <div className="border border-[rgba(201,168,76,0.2)] rounded-none">
            {validation.investmentBreakdown.lineItems.map((item, index) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom: index < validation.investmentBreakdown.lineItems.length - 1
                    ? '1px solid rgba(201,168,76,0.1)'
                    : 'none',
                }}
              >
                <span
                  className="text-sm"
                  style={{ color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'rgba(245,240,232,0.35)' }}>$</span>
                  <input
                    type="text"
                    value={editableAmounts[item.key]?.toLocaleString() ?? ''}
                    onChange={(e) => handleEdit(item.key, e.target.value)}
                    className="bg-transparent text-right border-b border-[rgba(201,168,76,0.2)] focus:border-[#C9A84C] outline-none transition-colors"
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '20px',
                      fontWeight: 400,
                      color: '#f5f0e8',
                      width: '120px',
                      padding: '2px 0',
                    }}
                    aria-label={`${item.label} amount`}
                  />
                </div>
              </div>
            ))}

            {/* Total row */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderTop: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.05)' }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
              >
                Total
              </span>
              <span
                className="font-light"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '24px',
                  color: sumMatchesTotal ? '#C9A84C' : '#f5f0e8',
                }}
              >
                ${currentSum.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Fund Sources Section */}
        {validation.fundSources.sources.length > 0 && (
          <div className="mb-8">
            <h2
              className="text-lg font-light tracking-wide mb-4 uppercase"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                color: '#C9A84C',
                fontSize: '13px',
                letterSpacing: '0.1em',
              }}
            >
              Fund Sources
            </h2>

            <div className="border border-[rgba(201,168,76,0.2)] rounded-none">
              {validation.fundSources.sources.map((source, index) => (
                <div
                  key={source.key}
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderBottom: index < validation.fundSources.sources.length - 1
                      ? '1px solid rgba(201,168,76,0.1)'
                      : 'none',
                  }}
                >
                  <span
                    className="text-sm"
                    style={{ color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {source.label}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: 'rgba(245,240,232,0.45)', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Documented
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discrepancy Pushback */}
        {discrepancy.active && (
          <div
            className="mb-8 p-5 border border-[rgba(201,168,76,0.3)]"
            style={{ background: 'rgba(201,168,76,0.05)' }}
          >
            <p
              className="text-sm mb-4 leading-relaxed"
              style={{ color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif" }}
            >
              That would put <strong>{discrepancy.editedLabel}</strong> at{' '}
              <strong>${discrepancy.editedValue.toLocaleString()}</strong> — but your total
              investment was <strong>${discrepancy.originalTotal.toLocaleString()}</strong>. Did
              you mean ${discrepancy.editedValue.toLocaleString()}, or has your total investment
              changed too?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAcceptNewTotal}
                className="px-5 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: 'rgba(201,168,76,0.15)',
                  color: '#C9A84C',
                  border: '1px solid rgba(201,168,76,0.3)',
                }}
              >
                Yes, update my total to ${currentSum.toLocaleString()}
              </button>
              <button
                onClick={handleRevertEdit}
                className="px-5 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: 'transparent',
                  color: 'rgba(245,240,232,0.65)',
                  border: '1px solid rgba(245,240,232,0.15)',
                }}
              >
                No, I meant to enter a different number
              </button>
            </div>
          </div>
        )}

        {/* Consistency indicator */}
        {!sumMatchesTotal && !discrepancy.active && !discrepancyResolved && (
          <div
            className="mb-6 p-4 text-sm"
            style={{
              color: 'rgba(245,240,232,0.65)',
              background: 'rgba(201,168,76,0.05)',
              border: '1px solid rgba(201,168,76,0.15)',
            }}
          >
            The breakdown sum (${currentSum.toLocaleString()}) doesn&apos;t quite match your total
            (${displayedTotal.toLocaleString()}). Please adjust a line item to resolve this, or
            update your total.
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="flex-1 px-6 py-3.5 text-sm font-medium tracking-wide transition-all"
            style={{
              background: confirmDisabled ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.2)',
              color: confirmDisabled ? 'rgba(201,168,76,0.4)' : '#C9A84C',
              border: `1px solid ${confirmDisabled ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.4)'}`,
              cursor: confirmDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {CONFIRM_LABEL}
          </button>
          <button
            onClick={handleNeedsFixing}
            className="px-6 py-3.5 text-sm font-medium tracking-wide transition-colors"
            style={{
              background: 'transparent',
              color: 'rgba(245,240,232,0.5)',
              border: '1px solid rgba(245,240,232,0.15)',
            }}
          >
            {NEEDS_FIXING_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
