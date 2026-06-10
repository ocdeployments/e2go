'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type {
  GapReport,
  CriticalGap,
  DocumentSummary,
} from '@/types/document-upload';

const SECTION_DISPLAY_NAMES: Record<string, string> = {
  section_1_story: 'Your story',
  section_2_business: 'Your business',
  section_3_investment: 'Your investment',
  section_4_qualifications: 'Your qualifications',
  section_5_family: 'Your family',
  section_6_ties: 'Your ties',
};

const SECTION_ORDER = [
  'section_1_story',
  'section_2_business',
  'section_3_investment',
  'section_4_qualifications',
  'section_5_family',
  'section_6_ties',
];

const DOC_TYPE_LABELS: Record<string, string> = {
  cover_letter: 'Cover letter',
  business_plan: 'Business plan',
  source_of_funds: 'Source of funds',
  biography: 'Investor biography',
  ds160: 'DS-160 form',
  projections: 'Financial projections',
  operating_agreement: 'Operating agreement',
  franchise_docs: 'Franchise documents',
  unknown: 'Unclassified',
};

interface GapReportClientProps {
  applicationId: string;
}

export default function GapReportClient({ applicationId }: GapReportClientProps) {
  const router = useRouter();
  const [report, setReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        // Try sessionStorage first (from extraction complete event)
        const cached = sessionStorage.getItem(`gap-report-${applicationId}`);
        if (cached) {
          setReport(JSON.parse(cached));
          setLoading(false);
          return;
        }

        // Fall back to API
        const response = await fetch(
          `/api/documents/gap-report?applicationId=${applicationId}`
        );

        if (!response.ok) {
          throw new Error('Failed to load gap report');
        }

        const data = await response.json();
        setReport(data);
        setLoading(false);
      } catch {
        setError('Failed to load gap report');
        setLoading(false);
      }
    };

    loadReport();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p
          className="text-sm"
          style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif" }}
        >
          Loading gap report...
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <p
            className="mb-4 text-sm"
            style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif" }}
          >
            {error || 'No gap report available'}
          </p>
          <a
            href="/apply"
            className="text-[11px] uppercase tracking-[0.08em]"
            style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
          >
            Return to case file
          </a>
        </div>
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
              Gap report
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
            Here is what we found
          </h2>
          <p
            className="text-[11px] leading-relaxed"
            style={{
              color: 'rgba(245,240,232,0.4)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            We found answers to {report.filledCount} of {report.totalQuestions} questions
            in your case file. Here is what still needs your input.
          </p>
        </div>

        {/* Section coverage grid */}
        <div className="mb-10">
          <h3
            className="mb-4 text-[10px] uppercase tracking-[0.1em]"
            style={{
              color: 'rgba(245,240,232,0.3)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Section coverage
          </h3>
          <div className="space-y-3">
            {SECTION_ORDER.map((sectionKey) => {
              const coverage = report.sectionCoverage[sectionKey];
              if (!coverage) return null;

              const displayName = SECTION_DISPLAY_NAMES[sectionKey] || sectionKey;
              const pct = coverage.percentage;

              return (
                <div key={sectionKey}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className="text-[11px]"
                      style={{
                        color: 'rgba(245,240,232,0.6)',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Section {sectionKey.split('_')[1]?.charAt(0) || ''} &mdash; {displayName}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{
                        color: pct >= 80
                          ? 'rgba(201,168,76,0.6)'
                          : pct >= 40
                          ? 'rgba(245,240,232,0.35)'
                          : 'rgba(200,120,120,0.5)',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {pct}% filled
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: 'rgba(201,168,76,0.08)' }}
                  >
                    <div
                      className="h-1.5 transition-all duration-500"
                      style={{
                        backgroundColor: pct >= 80
                          ? '#C9A84C'
                          : pct >= 40
                          ? 'rgba(201,168,76,0.5)'
                          : 'rgba(200,80,80,0.4)',
                        width: `${pct}%`,
                      }}
                    />
                  </div>
                  <p
                    className="mt-1 text-[9px]"
                    style={{
                      color: 'rgba(245,240,232,0.2)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {coverage.filled} of {coverage.total} questions
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical gaps */}
        {report.criticalGaps.length > 0 && (
          <div className="mb-10">
            <h3
              className="mb-4 text-[10px] uppercase tracking-[0.1em]"
              style={{
                color: 'rgba(245,240,232,0.3)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Critical gaps &mdash; not found in your documents
            </h3>
            <div className="space-y-3">
              {report.criticalGaps.map((gap: CriticalGap) => (
                <div
                  key={gap.questionId}
                  className="border p-4"
                  style={{
                    borderColor: gap.severity === 'high'
                      ? 'rgba(200,80,80,0.2)'
                      : 'rgba(201,168,76,0.1)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 text-[10px]"
                      style={{
                        color: gap.severity === 'high'
                          ? 'rgba(200,120,120,0.7)'
                          : 'rgba(201,168,76,0.5)',
                      }}
                    >
                      &#9888;
                    </span>
                    <div>
                      <p
                        className="text-[11px]"
                        style={{
                          color: gap.severity === 'high'
                            ? 'rgba(200,120,120,0.9)'
                            : '#f5f0e8',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {gap.label}
                      </p>
                      <p
                        className="mt-1 text-[10px] leading-relaxed"
                        style={{
                          color: 'rgba(245,240,232,0.35)',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {gap.reason}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document summaries */}
        {report.documentSummaries.length > 0 && (
          <div className="mb-10">
            <h3
              className="mb-4 text-[10px] uppercase tracking-[0.1em]"
              style={{
                color: 'rgba(245,240,232,0.3)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Documents processed
            </h3>
            <div className="space-y-3">
              {report.documentSummaries.map((doc: DocumentSummary) => (
                <div
                  key={doc.documentId}
                  className="border p-4"
                  style={{ borderColor: 'rgba(201,168,76,0.08)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[11px]"
                        style={{
                          color: '#f5f0e8',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {doc.filename}
                      </p>
                      <p
                        className="mt-0.5 text-[10px]"
                        style={{
                          color: 'rgba(245,240,232,0.3)',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {DOC_TYPE_LABELS[doc.detectedType || 'unknown']}
                        {doc.fieldsExtracted > 0 && (
                          <span className="ml-2">
                            &middot; {doc.fieldsExtracted} field{doc.fieldsExtracted !== 1 ? 's' : ''} extracted
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {doc.summary && (
                    <p
                      className="mt-2 text-[10px] leading-relaxed"
                      style={{
                        color: 'rgba(245,240,232,0.35)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontStyle: 'italic',
                      }}
                    >
                      {doc.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={() => router.push('/apply')}
          className="w-full border py-3 text-[11px] uppercase tracking-[0.1em] transition-colors hover:bg-[rgba(201,168,76,0.04)]"
          style={{
            borderColor: '#C9A84C',
            color: '#C9A84C',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          Complete my case file →
        </button>
      </div>
    </div>
  );
}
