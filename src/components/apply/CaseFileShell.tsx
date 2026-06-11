'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ClusterItem {
  id: string;
  label: string;
  status: 'complete' | 'active' | 'pending';
}

interface CaseFileShellProps {
  sectionNumber: 1 | 2 | 3 | 4 | 5 | 6;
  sectionTitle: string;
  clusters: ClusterItem[];
  activeClusterId: string;
  onClusterChange: (id: string) => void;
  buildsDocuments: string[];
  nextSectionPath: string;
  prevSectionPath: string;
  isSaving: boolean;
  children: React.ReactNode;
  previewContent: React.ReactNode;
}

const SECTION_NAMES: Record<number, string> = {
  1: 'Your Story',
  2: 'Your Business',
  3: 'Your Investment',
  4: 'Your Qualifications',
  5: 'Your Family',
  6: 'Your Ties',
};

export default function CaseFileShell({
  sectionNumber,
  sectionTitle,
  clusters,
  activeClusterId,
  onClusterChange,
  buildsDocuments,
  nextSectionPath,
  prevSectionPath,
  isSaving,
  children,
  previewContent,
}: CaseFileShellProps) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const nextSectionName = SECTION_NAMES[sectionNumber + 1] || '';

  const handleBack = useCallback(() => {
    router.push(prevSectionPath);
  }, [router, prevSectionPath]);

  const handleNext = useCallback(() => {
    router.push(nextSectionPath);
  }, [router, nextSectionPath]);

  // Close preview on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewOpen(false);
        setMobilePreviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      {/* ── Topbar ── */}
      <header
        className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b px-5"
        style={{
          height: '52px',
          borderColor: 'rgba(201,168,76,0.10)',
          backgroundColor: '#0a0a0a',
        }}
      >
        {/* Left: Back + title */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 transition-colors hover:opacity-80"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 300,
              color: 'rgba(245,240,232,0.30)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to case file</span>
          </button>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: '18px',
              color: '#f5f0e8',
            }}
          >
            {sectionTitle}
          </h1>

          <span
            className="inline-flex items-center border px-2.5 py-0.5"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '10px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#C9A84C',
              borderColor: 'rgba(201,168,76,0.25)',
            }}
          >
            {sectionNumber} of 6
          </span>
        </div>

        {/* Right: Save status + next */}
        <div className="flex items-center gap-4">
          {/* Auto-save indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`h-[5px] w-[5px] ${isSaving ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: isSaving ? '#C9A84C' : 'rgba(201,168,76,0.35)',
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.25)',
              }}
            >
              {isSaving ? 'Saving…' : 'Auto-saved'}
            </span>
          </div>

          {/* Preview toggle (tablet) */}
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="hidden items-center gap-1.5 border px-3 py-1.5 transition-colors hover:bg-[rgba(201,168,76,0.04)] lg:hidden"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(245,240,232,0.40)',
              borderColor: 'rgba(245,240,232,0.08)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>

          {/* Next section button */}
          {sectionNumber < 6 && (
            <button
              onClick={handleNext}
              className="transition-opacity hover:opacity-90"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#0a0a0a',
                backgroundColor: '#C9A84C',
                padding: '7px 16px',
              }}
            >
              Next: {nextSectionName} &rarr;
            </button>
          )}
        </div>
      </header>

      {/* ── Main body ── */}
      <div className="flex min-h-0 flex-1">
        {/* ── Left sidebar (desktop/tablet) ── */}
        <aside
          className="hidden shrink-0 flex-col border-r lg:flex"
          style={{
            width: '200px',
            borderColor: 'rgba(201,168,76,0.08)',
            backgroundColor: 'rgba(201,168,76,0.01)',
          }}
        >
          <div className="flex flex-1 flex-col overflow-y-auto py-6">
            {/* Clusters label */}
            <div
              className="mb-2.5 border-b px-5 pb-2.5"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '9px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: 'rgba(245,240,232,0.20)',
                borderColor: 'rgba(201,168,76,0.06)',
              }}
            >
              Clusters
            </div>

            {/* Cluster nav */}
            <nav className="px-3">
              <ul>
                {clusters.map((cluster) => {
                  const isActive = cluster.id === activeClusterId;
                  const isComplete = cluster.status === 'complete';

                  return (
                    <li key={cluster.id}>
                      <button
                        onClick={() => onClusterChange(cluster.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                        style={{
                          backgroundColor: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(201,168,76,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* 18x18 cluster icon */}
                        <span
                          className="flex shrink-0 items-center justify-center"
                          style={{
                            width: '18px',
                            height: '18px',
                            border: isComplete
                              ? '1px solid rgba(201,168,76,0.35)'
                              : isActive
                                ? '1px solid #C9A84C'
                                : '1px solid rgba(245,240,232,0.10)',
                            backgroundColor: isComplete ? 'rgba(201,168,76,0.10)' : 'transparent',
                          }}
                        >
                          {isComplete ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isActive ? (
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#C9A84C',
                              }}
                            />
                          ) : null}
                        </span>

                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '12px',
                            fontWeight: 300,
                            color: isActive
                              ? '#f5f0e8'
                              : isComplete
                                ? 'rgba(245,240,232,0.50)'
                                : 'rgba(245,240,232,0.35)',
                          }}
                        >
                          {cluster.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Divider */}
            <div
              className="mx-5 my-4"
              style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}
            />

            {/* This section builds */}
            <div className="px-5">
              <p
                className="mb-2"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '9px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: 'rgba(245,240,232,0.20)',
                }}
              >
                This section builds
              </p>
              <ul>
                {buildsDocuments.map((doc) => (
                  <li
                    key={doc}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '11px',
                      fontWeight: 300,
                      color: 'rgba(245,240,232,0.35)',
                      lineHeight: '1.8',
                    }}
                  >
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* ── Mobile cluster pill strip ── */}
        <div
          className="fixed top-[52px] left-0 right-0 z-30 flex overflow-x-auto border-b lg:hidden"
          style={{
            borderColor: 'rgba(201,168,76,0.10)',
            backgroundColor: '#0a0a0a',
          }}
        >
          {clusters.map((cluster) => {
            const isActive = cluster.id === activeClusterId;
            return (
              <button
                key={cluster.id}
                onClick={() => onClusterChange(cluster.id)}
                className="shrink-0 border-b px-4 py-2.5"
                style={{
                  borderColor: isActive ? '#C9A84C' : 'transparent',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '10px',
                  fontWeight: isActive ? 500 : 300,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: isActive ? '#C9A84C' : 'rgba(245,240,232,0.28)',
                }}
              >
                {cluster.status === 'complete' ? '✓ ' : ''}{cluster.label}
              </button>
            );
          })}
        </div>

        {/* ── Question panel (center) ── */}
        <main
          className="min-w-0 flex-1 overflow-y-auto pt-[44px] lg:pt-0"
          style={{ padding: '32px 36px' }}
        >
          <div className="mx-auto" style={{ maxWidth: '640px' }}>
            {children}
          </div>

          {/* Mobile: "See document" button at bottom */}
          <div className="mt-8 flex justify-center lg:hidden">
            <button
              onClick={() => setMobilePreviewOpen(true)}
              className="inline-flex items-center gap-2 border px-5 py-2.5 transition-colors hover:bg-[rgba(201,168,76,0.04)]"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(245,240,232,0.40)',
                borderColor: 'rgba(245,240,232,0.10)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              See document
            </button>
          </div>
        </main>

        {/* ── Document preview panel (desktop) ── */}
        <aside
          className="hidden shrink-0 overflow-y-auto border-l xl:flex"
          style={{
            width: '1fr',
            minWidth: '320px',
            maxWidth: '420px',
            borderColor: 'rgba(201,168,76,0.08)',
            backgroundColor: 'rgba(201,168,76,0.01)',
            padding: '28px 24px',
          }}
        >
          <div className="w-full">
            {/* Preview header */}
            <div className="mb-5 flex items-center justify-between">
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '9px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.20em',
                  color: 'rgba(245,240,232,0.22)',
                }}
              >
                Document preview
              </span>
            </div>
            {previewContent}
          </div>
        </aside>

        {/* ── Preview drawer (tablet) ── */}
        {previewOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 lg:hidden"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={() => setPreviewOpen(false)}
            />
            {/* Drawer */}
            <div
              className="fixed top-0 right-0 z-50 flex h-full flex-col overflow-y-auto border-l lg:hidden"
              style={{
                width: '380px',
                maxWidth: '100vw',
                borderColor: 'rgba(201,168,76,0.12)',
                borderLeftColor: '#C9A84C',
                borderLeftWidth: '1px',
                backgroundColor: '#0a0a0a',
                padding: '20px 24px',
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '9px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.20em',
                    color: 'rgba(245,240,232,0.22)',
                  }}
                >
                  Document preview
                </span>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="flex items-center justify-center"
                  style={{
                    width: '28px',
                    height: '28px',
                    color: '#C9A84C',
                    border: '1px solid rgba(201,168,76,0.25)',
                    background: 'transparent',
                  }}
                  aria-label="Close preview"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {previewContent}
            </div>
          </>
        )}

        {/* ── Mobile preview overlay ── */}
        {mobilePreviewOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto lg:hidden"
            style={{
              backgroundColor: '#0a0a0a',
              padding: '16px 20px',
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '9px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.20em',
                  color: 'rgba(245,240,232,0.22)',
                }}
              >
                Document preview
              </span>
              <button
                onClick={() => setMobilePreviewOpen(false)}
                className="flex items-center justify-center"
                style={{
                  width: '32px',
                  height: '32px',
                  color: '#C9A84C',
                  border: '1px solid rgba(201,168,76,0.25)',
                  background: 'transparent',
                }}
                aria-label="Close preview"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {previewContent}
          </div>
        )}
      </div>
    </div>
  );
}
