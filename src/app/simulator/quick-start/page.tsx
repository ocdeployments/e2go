/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUSINESS_CATEGORIES = [
  { value: 'senior_care', label: 'Senior Care / Home Health' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'commercial_cleaning', label: 'Commercial Cleaning' },
  { value: 'it_consulting', label: 'IT Consulting / Tech' },
  { value: 'restaurant', label: 'Restaurant / Food Service' },
  { value: 'retail', label: 'Retail' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'consulting', label: 'Professional Consulting' },
  { value: 'import_export', label: 'Import / Export' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'healthcare', label: 'Healthcare / Medical' },
  { value: 'education', label: 'Education / Training' },
  { value: 'other', label: 'Other' },
];

const TARGET_CONSULATES = [
  { value: 'toronto', label: 'Toronto, Canada' },
  { value: 'london', label: 'London, UK' },
  { value: 'manila', label: 'Manila, Philippines' },
  { value: 'seoul', label: 'Seoul, South Korea' },
  { value: 'mumbai', label: 'Mumbai, India' },
  { value: 'other', label: 'Other' },
];

interface PendingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'cover_letter' | 'business_plan' | 'other';
  error?: string;
}

type Step = 'form' | 'upload' | 'processing' | 'complete';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SimulatorQuickStart() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [authReady, setAuthReady] = useState(false);

  // Form state
  const [businessCategory, setBusinessCategory] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [targetConsulate, setTargetConsulate] = useState('toronto');

  // Upload state
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [documents, setDocuments] = useState<{
    documentId: string;
    filename: string;
    status: 'waiting' | 'classified' | 'extracting' | 'complete' | 'failed';
    fieldsFound?: number;
    error?: string;
  }[]>([]);
  const [overallStatus, setOverallStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedExtraction = useRef(false);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?next=/simulator/quick-start');
        return;
      }
      setAuthReady(true);
    }
    checkAuth();
  }, [router]);

  // ===========================================================================
  // FILE MANAGEMENT
  // ===========================================================================

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
        newFiles.push({
          id: `file-${Date.now()}-${i}`,
          file,
          name: file.name,
          size: file.size,
          type: 'other',
          error: 'Only PDF and DOCX files accepted',
        });
        continue;
      }
      // Auto-detect type from filename
      let detectedType: PendingFile['type'] = 'other';
      const lower = file.name.toLowerCase();
      if (lower.includes('cover') || lower.includes('letter')) {
        detectedType = 'cover_letter';
      } else if (lower.includes('business') || lower.includes('plan')) {
        detectedType = 'business_plan';
      }
      newFiles.push({
        id: `file-${Date.now()}-${i}`,
        file,
        name: file.name,
        size: file.size,
        type: detectedType,
      });
    }
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const updateFileType = useCallback((id: string, type: PendingFile['type']) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, type } : f));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, [addFiles]);

  // ===========================================================================
  // FORM SUBMISSION → CREATE APPLICATION → UPLOAD → EXTRACT
  // ===========================================================================

  const handleStart = async () => {
    if (!businessCategory) return;

    const validFiles = files.filter(f => !f.error);
    if (validFiles.length === 0) {
      setUploadError('Please upload at least one document (cover letter or business plan).');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Create minimal application
      const appRes = await fetch('/api/simulator/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessCategory,
          applicantName: applicantName || undefined,
          targetConsulate,
        }),
      });

      if (!appRes.ok) {
        const errData = await appRes.json();
        throw new Error(errData.error || 'Failed to create application');
      }

      const { applicationId: appId } = await appRes.json();

      // 2. Upload documents
      const formData = new FormData();
      formData.append('applicationId', appId);

      validFiles.forEach((f, idx) => {
        formData.append(`file_${idx}`, f.file);
        formData.append(`type_${idx}`, f.type);
      });

      const uploadRes = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || 'Failed to upload documents');
      }

      const { documents: uploadedDocs } = await uploadRes.json();
      const docIds = uploadedDocs.map((d: { id: string }) => d.id);

      // 3. Move to processing step
      setDocuments(docIds.map((id: string) => ({
        documentId: id,
        filename: '...',
        status: 'waiting' as const,
      })));
      setStep('processing');

      // 4. Start extraction
      await startExtraction(appId, docIds);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  // ===========================================================================
  // SSE EXTRACTION
  // ===========================================================================

  const startExtraction = useCallback(async (appId: string, docIds: string[]) => {
    if (hasStartedExtraction.current) return;
    hasStartedExtraction.current = true;

    try {
      const response = await fetch('/api/documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, documentIds: docIds }),
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

            case 'extraction_complete':
              setOverallStatus('complete');
              setTimeout(() => {
                router.push('/simulator');
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
  }, [router]);

  // ===========================================================================
  // RENDER — FORM STEP
  // ===========================================================================

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f0e8',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ maxWidth: '560px', width: '100%' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ color: '#C9A84C', fontSize: '12px' }}>&#9670;</span>
              <span style={{
                color: '#C9A84C',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                fontWeight: 500,
              }}>
                SIMULATOR QUICK START
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '36px',
              fontWeight: 300,
              color: '#f5f0e8',
              lineHeight: 1.1,
              marginBottom: '12px',
            }}>
              Upload &amp; Start Practicing
            </h1>
            <p style={{
              fontSize: '15px',
              fontWeight: 300,
              color: 'rgba(245,240,232,0.6)',
              lineHeight: 1.7,
            }}>
              Upload your cover letter and/or business plan. We&apos;ll extract your key details
              and generate personalised interview questions.
            </p>
          </div>

          {/* Form card */}
          <div style={{
            padding: '32px',
            background: 'rgba(201,168,76,0.02)',
            border: '1px solid rgba(201,168,76,0.12)',
          }}>
            {/* Business Category */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(245,240,232,0.7)',
                marginBottom: '8px',
              }}>
                Business category <span style={{ color: '#C9A84C' }}>*</span>
              </label>
              <select
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: '#f5f0e8',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  appearance: 'none' as const,
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ background: '#0a0a0a' }}>Select your business type...</option>
                {BUSINESS_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value} style={{ background: '#0a0a0a' }}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Applicant Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(245,240,232,0.7)',
                marginBottom: '8px',
              }}>
                Your name <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: '12px' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="e.g. Michael Chen"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: '#f5f0e8',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>

            {/* Target Consulate */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(245,240,232,0.7)',
                marginBottom: '8px',
              }}>
                Target consulate
              </label>
              <select
                value={targetConsulate}
                onChange={(e) => setTargetConsulate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: '#f5f0e8',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  appearance: 'none' as const,
                  cursor: 'pointer',
                }}
              >
                {TARGET_CONSULATES.map(c => (
                  <option key={c.value} value={c.value} style={{ background: '#0a0a0a' }}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Upload Section */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(245,240,232,0.7)',
                marginBottom: '8px',
              }}>
                Documents <span style={{ color: '#C9A84C' }}>*</span>
                <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: '12px', marginLeft: '8px' }}>
                  Cover letter and/or business plan (PDF or DOCX)
                </span>
              </label>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '32px 24px',
                  border: `1px dashed ${isDragging ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`,
                  background: isDragging ? 'rgba(201,168,76,0.04)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center' as const,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <svg
                  width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(201,168,76,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ margin: '0 auto 12px' }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(245,240,232,0.6)',
                  marginBottom: '4px',
                }}>
                  Drop files here or <span style={{ color: '#C9A84C' }}>browse</span>
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)' }}>
                  PDF or DOCX — at least one document required
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />

              {/* File list */}
              {files.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  {files.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        border: `1px solid ${f.error ? 'rgba(200,80,80,0.2)' : 'rgba(201,168,76,0.08)'}`,
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '13px',
                          color: f.error ? 'rgba(200,120,120,0.8)' : '#f5f0e8',
                          whiteSpace: 'nowrap' as const,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {f.name}
                        </p>
                        {f.error && (
                          <p style={{ fontSize: '11px', color: 'rgba(200,120,120,0.6)', marginTop: '2px' }}>
                            {f.error}
                          </p>
                        )}
                      </div>

                      {!f.error && (
                        <select
                          value={f.type}
                          onChange={(e) => updateFileType(f.id, e.target.value as PendingFile['type'])}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(201,168,76,0.15)',
                            color: 'rgba(245,240,232,0.6)',
                            fontSize: '11px',
                            fontFamily: "'DM Sans', sans-serif",
                            cursor: 'pointer',
                          }}
                        >
                          <option value="cover_letter" style={{ background: '#0a0a0a' }}>Cover letter</option>
                          <option value="business_plan" style={{ background: '#0a0a0a' }}>Business plan</option>
                          <option value="other" style={{ background: '#0a0a0a' }}>Other</option>
                        </select>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(245,240,232,0.3)',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '16px',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {uploadError && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                fontSize: '13px',
                marginBottom: '20px',
              }}>
                {uploadError}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleStart}
              disabled={!businessCategory || files.filter(f => !f.error).length === 0 || uploading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: (!businessCategory || files.filter(f => !f.error).length === 0 || uploading)
                  ? 'rgba(201,168,76,0.3)'
                  : '#C9A84C',
                color: '#0a0a0a',
                fontSize: '15px',
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                cursor: (!businessCategory || files.filter(f => !f.error).length === 0 || uploading)
                  ? 'not-allowed'
                  : 'pointer',
                border: 'none',
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? 'Creating...' : 'Create & Upload'}
            </button>
          </div>

          {/* Back link */}
          <div style={{ marginTop: '20px', textAlign: 'center' as const }}>
            <a
              href="/simulator"
              style={{
                color: '#C9A84C',
                fontSize: '14px',
                textDecoration: 'underline',
              }}
            >
              ← Back to Simulator
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER — PROCESSING STEP
  // ===========================================================================

  if (step === 'processing') {
    const completedCount = documents.filter(d => d.status === 'complete').length;
    const failedCount = documents.filter(d => d.status === 'failed').length;

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f0e8',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ maxWidth: '560px', width: '100%' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ color: '#C9A84C', fontSize: '12px' }}>&#9670;</span>
              <span style={{
                color: '#C9A84C',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                fontWeight: 500,
              }}>
                READING DOCUMENTS
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '32px',
              fontWeight: 300,
              color: '#f5f0e8',
              lineHeight: 1.1,
              marginBottom: '8px',
            }}>
              {overallStatus === 'complete'
                ? 'Extraction complete'
                : overallStatus === 'error'
                ? 'Something went wrong'
                : 'Reading your documents...'}
            </h1>
            {overallStatus === 'processing' && (
              <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.4)' }}>
                This takes about 30&ndash;60 seconds per document.
              </p>
            )}
            {overallStatus === 'complete' && (
              <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.4)' }}>
                {completedCount} document{completedCount !== 1 ? 's' : ''} processed.
                Redirecting to simulator...
              </p>
            )}
          </div>

          {/* Error */}
          {errorMessage && (
            <div style={{
              padding: '16px',
              border: '1px solid rgba(200,80,80,0.3)',
              color: 'rgba(200,120,120,0.9)',
              fontSize: '13px',
              marginBottom: '24px',
            }}>
              {errorMessage}
              <button
                onClick={() => router.push('/simulator')}
                style={{
                  display: 'block',
                  marginTop: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#C9A84C',
                  fontSize: '11px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Return to simulator
              </button>
            </div>
          )}

          {/* Document progress */}
          <div>
            {documents.map((doc) => (
              <div
                key={doc.documentId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  border: `1px solid ${
                    doc.status === 'failed' ? 'rgba(200,80,80,0.2)'
                    : doc.status === 'complete' ? 'rgba(201,168,76,0.15)'
                    : 'rgba(201,168,76,0.06)'
                  }`,
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    flexShrink: 0,
                    background: doc.status === 'complete' ? '#C9A84C'
                      : doc.status === 'failed' ? 'rgba(200,80,80,0.7)'
                      : doc.status === 'waiting' ? 'rgba(245,240,232,0.15)'
                      : 'rgba(201,168,76,0.5)',
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: '13px',
                      color: doc.status === 'failed' ? 'rgba(200,120,120,0.8)' : '#f5f0e8',
                      whiteSpace: 'nowrap' as const,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {doc.filename}
                    </p>
                    {doc.error && (
                      <p style={{ fontSize: '11px', color: 'rgba(200,120,120,0.6)', marginTop: '2px' }}>
                        {doc.error}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                  {doc.status === 'waiting' && (
                    <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.25)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                      Waiting...
                    </span>
                  )}
                  {doc.status === 'classified' && (
                    <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                      Classifying...
                    </span>
                  )}
                  {doc.status === 'extracting' && (
                    <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                      Extracting...
                    </span>
                  )}
                  {doc.status === 'complete' && (
                    <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                      {doc.fieldsFound !== undefined ? `${doc.fieldsFound} fields` : 'Complete'}
                    </span>
                  )}
                  {doc.status === 'failed' && (
                    <span style={{ fontSize: '11px', color: 'rgba(200,120,120,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {overallStatus === 'processing' && documents.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ height: '1px', width: '100%', background: 'rgba(201,168,76,0.1)' }}>
                <div style={{
                  height: '1px',
                  width: `${((completedCount + failedCount) / documents.length) * 100}%`,
                  background: '#C9A84C',
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
