'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
// SSE processing types are inline — no external type imports needed

type DocStatus = 'waiting' | 'extracting' | 'classified' | 'complete' | 'failed';

interface DocumentProgress {
  documentId: string;
  filename: string;
  status: DocStatus;
  fieldsFound?: number;
  error?: string;
}

interface ProcessingClientProps {
  documentIds: string[];
  applicationId: string;
}

export default function ProcessingClient({ documentIds, applicationId }: ProcessingClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentProgress[]>(
    documentIds.map(id => ({ documentId: id, filename: '...', status: 'waiting' }))
  );
  const [overallStatus, setOverallStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [discrepancyCount, setDiscrepancyCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const handleExtraction = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    try {
      const response = await fetch('/api/documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, documentIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to start extraction');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (!message.trim()) continue;

          const eventMatch = message.match(/^event: (.+)$/m);
          const dataMatch = message.match(/^data: (.+)$/m);

          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          switch (event) {
            case 'document_start':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId
                  ? { ...d, filename: data.filename, status: 'waiting' }
                  : d
              ));
              break;

            case 'document_classified':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId
                  ? { ...d, status: 'classified' }
                  : d
              ));
              break;

            case 'document_extracted':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId
                  ? { ...d, status: 'extracting', fieldsFound: data.fieldsFound }
                  : d
              ));
              break;

            case 'document_complete':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId
                  ? { ...d, status: 'complete' }
                  : d
              ));
              break;

            case 'document_error':
              setDocuments(prev => prev.map(d =>
                d.documentId === data.documentId
                  ? { ...d, status: 'failed', error: data.message }
                  : d
              ));
              break;

            case 'discrepancies_found':
              setDiscrepancyCount(data.count);
              break;

            case 'extraction_complete':
              setOverallStatus('complete');
              // Navigate after a brief delay to show completion state
              setTimeout(() => {
                if (data.gapReport) {
                  // Store gap report in sessionStorage for the gaps page
                  sessionStorage.setItem(
                    `gap-report-${applicationId}`,
                    JSON.stringify(data.gapReport)
                  );
                }
                if (discrepancyCount > 0) {
                  router.push(`/apply/upload/review?app=${applicationId}`);
                } else {
                  router.push(`/apply/upload/gaps?app=${applicationId}`);
                }
              }, 1500);
              break;

            case 'error':
              setOverallStatus('error');
              setErrorMessage(data.message);
              break;
          }
        }
      }
    } catch (err) {
      setOverallStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Extraction failed');
    }
  }, [applicationId, documentIds, discrepancyCount, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    handleExtraction();
  }, [handleExtraction]);

  const completedCount = documents.filter(d => d.status === 'complete').length;
  const failedCount = documents.filter(d => d.status === 'failed').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
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
              Reading documents
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
            {overallStatus === 'complete'
              ? 'Extraction complete'
              : overallStatus === 'error'
              ? 'Something went wrong'
              : 'Reading your documents...'}
          </h2>
          {overallStatus === 'processing' && (
            <p
              className="text-[11px] leading-relaxed"
              style={{
                color: 'rgba(245,240,232,0.4)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              This takes about 30&ndash;60 seconds per document.
            </p>
          )}
          {overallStatus === 'complete' && (
            <p
              className="text-[11px] leading-relaxed"
              style={{
                color: 'rgba(245,240,232,0.4)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {completedCount} document{completedCount !== 1 ? 's' : ''} processed.
              {discrepancyCount > 0
                ? ` ${discrepancyCount} discrepanc${discrepancyCount !== 1 ? 'ies' : 'y'} found.`
                : ' No conflicts found.'}
            </p>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            className="mb-6 border p-4 text-[11px]"
            style={{
              borderColor: 'rgba(200,80,80,0.3)',
              color: 'rgba(200,120,120,0.9)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {errorMessage}
            <button
              onClick={() => router.push('/apply')}
              className="mt-3 block text-[10px] uppercase tracking-[0.05em]"
              style={{ color: '#C9A84C' }}
            >
              Return to case file
            </button>
          </div>
        )}

        {/* Document progress list */}
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.documentId}
              className="border p-4"
              style={{
                borderColor: doc.status === 'failed'
                  ? 'rgba(200,80,80,0.2)'
                  : doc.status === 'complete'
                  ? 'rgba(201,168,76,0.15)'
                  : 'rgba(201,168,76,0.06)',
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div
                    className="h-2 w-2 flex-shrink-0"
                    style={{
                      backgroundColor:
                        doc.status === 'complete' ? '#C9A84C'
                        : doc.status === 'failed' ? 'rgba(200,80,80,0.7)'
                        : doc.status === 'waiting' ? 'rgba(245,240,232,0.15)'
                        : 'rgba(201,168,76,0.5)',
                    }}
                  />
                  <div>
                    <p
                      className="text-[11px]"
                      style={{
                        color: doc.status === 'failed'
                          ? 'rgba(200,120,120,0.8)'
                          : '#f5f0e8',
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 500,
                      }}
                    >
                      {doc.filename}
                    </p>
                    {doc.error && (
                      <p
                        className="mt-0.5 text-[10px]"
                        style={{
                          color: 'rgba(200,120,120,0.6)',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {doc.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {doc.status === 'waiting' && (
                    <span
                      className="text-[10px] uppercase tracking-[0.05em]"
                      style={{ color: 'rgba(245,240,232,0.25)', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Waiting...
                    </span>
                  )}
                  {doc.status === 'classified' && (
                    <span
                      className="text-[10px] uppercase tracking-[0.05em]"
                      style={{ color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Classifying...
                    </span>
                  )}
                  {doc.status === 'extracting' && (
                    <span
                      className="text-[10px] uppercase tracking-[0.05em]"
                      style={{ color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Extracting fields...
                    </span>
                  )}
                  {doc.status === 'complete' && (
                    <span
                      className="text-[10px] uppercase tracking-[0.05em]"
                      style={{ color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {doc.fieldsFound !== undefined
                        ? `${doc.fieldsFound} field${doc.fieldsFound !== 1 ? 's' : ''} found`
                        : 'Complete'}
                    </span>
                  )}
                  {doc.status === 'failed' && (
                    <span
                      className="text-[10px] uppercase tracking-[0.05em]"
                      style={{ color: 'rgba(200,120,120,0.6)', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {overallStatus === 'processing' && (
          <div className="mt-8">
            <div
              className="h-px w-full"
              style={{ backgroundColor: 'rgba(201,168,76,0.1)' }}
            >
              <div
                className="h-px transition-all duration-500"
                style={{
                  backgroundColor: '#C9A84C',
                  width: `${((completedCount + failedCount) / documents.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
