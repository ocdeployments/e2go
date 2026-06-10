'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { DocumentDiscrepancy, DiscrepancyValue } from '@/types/document-upload';

interface DiscrepancyReviewClientProps {
  applicationId: string;
}

interface ResolvedState {
  [discrepancyId: string]: {
    selectedValue: string | null;
    customValue: string;
    isCustom: boolean;
  };
}

export default function DiscrepancyReviewClient({ applicationId }: DiscrepancyReviewClientProps) {
  const router = useRouter();
  const [discrepancies, setDiscrepancies] = useState<DocumentDiscrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedState>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDiscrepancies = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('document_discrepancies')
          .select('*')
          .eq('application_id', applicationId)
          .is('resolved_value', null)
          .order('created_at', { ascending: true });

        if (fetchError) {
          throw new Error('Failed to load discrepancies');
        }

        setDiscrepancies(data || []);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    loadDiscrepancies();
  }, [applicationId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSelection = useCallback((discrepancyId: string, value: string | null, isCustom: boolean = false) => {
    setResolved(prev => ({
      ...prev,
      [discrepancyId]: {
        selectedValue: value,
        customValue: prev[discrepancyId]?.customValue || '',
        isCustom,
      },
    }));
  }, []);

  const updateCustomValue = useCallback((discrepancyId: string, value: string) => {
    setResolved(prev => ({
      ...prev,
      [discrepancyId]: {
        ...prev[discrepancyId],
        customValue: value,
        selectedValue: value,
        isCustom: true,
      },
    }));
  }, []);

  const allResolved = discrepancies.every(d => {
    const state = resolved[d.id];
    if (!state) return false;
    if (state.isCustom) return state.customValue.trim().length > 0;
    return state.selectedValue !== null;
  });

  const handleResolveAll = async () => {
    if (!allResolved) return;

    setResolving(true);
    setError(null);

    try {
      for (const disc of discrepancies) {
        const state = resolved[disc.id];
        if (!state) continue;

        const resolvedValue = state.isCustom ? state.customValue.trim() : state.selectedValue!;

        const response = await fetch('/api/documents/resolve-discrepancy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discrepancyId: disc.id,
            applicationId,
            resolvedValue,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to resolve discrepancy');
        }
      }

      // All resolved — navigate to gap report
      router.push(`/apply/upload/gaps?app=${applicationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resolution failed');
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p
          className="text-sm"
          style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif" }}
        >
          Loading discrepancies...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        {/* Back link */}
        <a
          href="/apply/upload"
          className="mb-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] transition-colors hover:text-[#C9A84C]"
          style={{
            color: 'rgba(245,240,232,0.35)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          &larr; Back to upload
        </a>

        {/* Header */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <span style={{ color: '#C9A84C' }}>&#9670;</span>
            <h1
              className="text-xs uppercase tracking-[0.1em]"
              style={{
                color: '#C9A84C',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              Discrepancy resolution
            </h1>
          </div>
          <h2
            className="mb-3 text-2xl font-light sm:text-3xl"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: '#f5f0e8',
              fontWeight: 300,
            }}
          >
            {discrepancies.length} discrepanc{discrepancies.length !== 1 ? 'ies' : 'y'} found
          </h2>
          <p
            className="text-[11px] leading-relaxed"
            style={{
              color: 'rgba(245,240,232,0.4)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Your documents contain conflicting information. Choose the
            correct value for each item below. This becomes the
            authorised figure throughout your entire application.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 border p-4 text-[11px]"
            style={{
              borderColor: 'rgba(200,80,80,0.3)',
              color: 'rgba(200,120,120,0.9)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {/* Discrepancy cards */}
        <div className="space-y-6">
          {discrepancies.map((disc) => {
            const state = resolved[disc.id];
            const values = disc.conflicting_values as DiscrepancyValue[];

            return (
              <div
                key={disc.id}
                className="border p-6"
                style={{ borderColor: 'rgba(201,168,76,0.12)' }}
              >
                {/* Question label */}
                <h3
                  className="mb-4 text-sm font-light"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: '#f5f0e8',
                    fontWeight: 400,
                    fontSize: '16px',
                  }}
                >
                  {disc.question_label || disc.question_id}
                </h3>

                {/* Value options */}
                <div className="space-y-3">
                  {values.map((val, idx) => (
                    <label
                      key={idx}
                      className="flex cursor-pointer items-start gap-3 border p-4 transition-colors"
                      style={{
                        borderColor:
                          state?.selectedValue === val.value && !state?.isCustom
                            ? 'rgba(201,168,76,0.3)'
                            : 'rgba(201,168,76,0.06)',
                        backgroundColor:
                          state?.selectedValue === val.value && !state?.isCustom
                            ? 'rgba(201,168,76,0.04)'
                            : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name={`disc-${disc.id}`}
                        checked={state?.selectedValue === val.value && !state?.isCustom}
                        onChange={() => updateSelection(disc.id, val.value)}
                        className="mt-0.5"
                        style={{ accentColor: '#C9A84C' }}
                      />
                      <div className="flex-1">
                        <p
                          className="text-[11px]"
                          style={{
                            color: '#f5f0e8',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                          }}
                        >
                          {val.display_value || val.value}
                        </p>
                        <p
                          className="mt-1 text-[10px] leading-relaxed"
                          style={{
                            color: 'rgba(245,240,232,0.35)',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          From: {val.source_document} &mdash; &ldquo;{val.source_quote}&rdquo;
                        </p>
                      </div>
                    </label>
                  ))}

                  {/* Custom value option */}
                  <label
                    className="flex cursor-pointer items-start gap-3 border p-4 transition-colors"
                    style={{
                      borderColor: state?.isCustom
                        ? 'rgba(201,168,76,0.3)'
                        : 'rgba(201,168,76,0.06)',
                      backgroundColor: state?.isCustom
                        ? 'rgba(201,168,76,0.04)'
                        : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name={`disc-${disc.id}`}
                      checked={state?.isCustom || false}
                      onChange={() => updateSelection(disc.id, state?.customValue || '', true)}
                      className="mt-0.5"
                      style={{ accentColor: '#C9A84C' }}
                    />
                    <div className="flex-1">
                      <p
                        className="mb-2 text-[11px]"
                        style={{
                          color: 'rgba(245,240,232,0.5)',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Enter a different value:
                      </p>
                      <input
                        type="text"
                        value={state?.customValue || ''}
                        onChange={(e) => updateCustomValue(disc.id, (e.target as HTMLInputElement).value)}
                        onClick={(e) => {
                          e.stopPropagation();
                          const target = e.target as HTMLInputElement;
                          updateSelection(disc.id, target.value, true);
                        }}
                        placeholder="Enter value..."
                        className="w-full border bg-transparent px-3 py-2 text-[11px]"
                        style={{
                          borderColor: 'rgba(201,168,76,0.12)',
                          color: '#f5f0e8',
                          fontFamily: "'DM Sans', sans-serif",
                          borderRadius: 0,
                        }}
                      />
                    </div>
                  </label>
                </div>

                {/* Warning note */}
                <p
                  className="mt-4 text-[10px] leading-relaxed"
                  style={{
                    color: 'rgba(201,168,76,0.4)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  This value will be used throughout your entire application.
                  All documents will reference this figure.
                </p>
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="mt-8">
          <button
            onClick={handleResolveAll}
            disabled={!allResolved || resolving}
            className="w-full border py-3 text-[11px] uppercase tracking-[0.1em] transition-colors"
            style={{
              borderColor: allResolved && !resolving ? '#C9A84C' : 'rgba(245,240,232,0.08)',
              color: allResolved && !resolving ? '#C9A84C' : 'rgba(245,240,232,0.2)',
              backgroundColor: allResolved && !resolving ? 'rgba(201,168,76,0.04)' : 'transparent',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              cursor: allResolved && !resolving ? 'pointer' : 'not-allowed',
            }}
          >
            {resolving ? 'Resolving...' : 'Continue →'}
          </button>
          {!allResolved && (
            <p
              className="mt-3 text-center text-[10px]"
              style={{
                color: 'rgba(245,240,232,0.2)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Resolve all discrepancies to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
