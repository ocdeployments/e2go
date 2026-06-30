'use client';

import { useState, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { ExtractedField, ParseDocumentResponse } from '@/app/api/apply/parse-document/route';

interface DocumentImportHubProps {
  applicationId: string | null;
  onFieldsApplied?: (count: number) => void;
}

type Stage = 'idle' | 'uploading' | 'reviewing' | 'saving' | 'done' | 'error';

const DOC_TYPE_OPTIONS = [
  { value: 'resume',              label: 'Resume / CV',                 hint: 'Fills name, education, experience, skills' },
  { value: 'fdd',                 label: 'Franchise Disclosure Document', hint: 'Fills business name, investment, franchise details' },
  { value: 'investment_records',  label: 'Bank / Investment Records',   hint: 'Fills investment amount, source of funds, net worth' },
  { value: 'business_plan',       label: 'Business Plan',               hint: 'Fills business name, location, employees, revenue' },
  { value: 'financial_statement', label: 'Personal Financial Statement', hint: 'Fills net worth, liquid assets, property' },
  { value: 'territory_analysis',  label: 'Territory / Market Analysis', hint: 'Fills target location, ZIP, business category' },
] as const;

export default function DocumentImportHub({ applicationId, onFieldsApplied }: DocumentImportHubProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [docType, setDocType] = useState<string>('resume');
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [docId, setDocId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const selectedFile = useRef<File | null>(null);

  function reset() {
    setStage('idle');
    setErrorMsg('');
    setFields([]);
    setAccepted(new Set());
    setDocId(null);
    selectedFile.current = null;
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleUpload() {
    if (!selectedFile.current) return;
    setStage('uploading');
    setErrorMsg('');

    const fd = new FormData();
    fd.append('file',    selectedFile.current);
    fd.append('docType', docType);
    if (applicationId) fd.append('applicationId', applicationId);

    try {
      const res = await fetch('/api/apply/parse-document', { method: 'POST', body: fd });
      const data: ParseDocumentResponse & { error?: string } = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Extraction failed. Please try again.');
        setStage('error');
        return;
      }

      if (data.fields.length === 0) {
        setErrorMsg('No matching fields found in this document. Try a different document type.');
        setStage('error');
        return;
      }

      setFields(data.fields);
      setDocId(data.docId);
      // Default: accept all
      setAccepted(new Set(data.fields.map(f => f.key)));
      setStage('reviewing');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStage('error');
    }
  }

  function toggleField(key: string) {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleApply() {
    const toApply = fields.filter(f => accepted.has(f.key));
    if (toApply.length === 0) return;

    setStage('saving');

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErrorMsg('Session expired. Please refresh.'); setStage('error'); return; }

      // Resolve primary application if not passed directly
      let appId = applicationId;
      if (!appId) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, source')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        appId = (apps ?? []).find((a: { source: string | null }) => a.source !== 'simulator_standalone')?.id ?? null;
      }
      if (!appId) { setErrorMsg('No active application found.'); setStage('error'); return; }

      // Upsert each accepted field
      const upserts = toApply.map(f => ({
        application_id: appId!,
        question_key:   f.key,
        answer_value:   f.value,
        source:         'document_upload',
        updated_at:     new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from('answers')
        .upsert(upserts, { onConflict: 'application_id,question_key' });

      if (upsertErr) { setErrorMsg('Failed to save fields. Please try again.'); setStage('error'); return; }

      // Update accepted count on upload record
      if (docId) {
        await supabase
          .from('uploaded_documents')
          .update({ fields_accepted: toApply.length })
          .eq('id', docId);
      }

      setSavedCount(toApply.length);
      setStage('done');
      onFieldsApplied?.(toApply.length);
    } catch {
      setErrorMsg('Unexpected error. Please try again.');
      setStage('error');
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-3 border p-4 text-left transition-colors hover:bg-[rgba(201,168,76,0.03)]"
        style={{ borderColor: 'rgba(201,168,76,0.15)', marginBottom: '16px' }}
      >
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ width: '32px', height: '32px', border: '1px solid rgba(201,168,76,0.25)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500, color: '#f5f0e8' }}>
            Import from a document
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(245,240,232,0.45)', marginTop: '2px' }}>
            Upload a resume, FDD, financial statement, or business plan — AI extracts and pre-fills your fields
          </p>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(201,168,76,0.45)', marginLeft: 'auto', flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="border"
      style={{ borderColor: 'rgba(201,168,76,0.2)', marginBottom: '16px', backgroundColor: 'rgba(201,168,76,0.015)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: 'rgba(201,168,76,0.12)' }}
      >
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C9A84C' }}>
          Import from document
        </span>
        <button
          onClick={() => { reset(); setIsOpen(false); }}
          style={{ color: 'rgba(245,240,232,0.4)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, fontSize: '16px' }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="p-5">
        {/* ── Stage: idle / uploading ── */}
        {(stage === 'idle' || stage === 'uploading') && (
          <>
            {/* Doc type selector */}
            <div className="mb-4">
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 500, color: 'rgba(245,240,232,0.65)', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
                Document type
              </label>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {DOC_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDocType(opt.value)}
                    className="border p-3 text-left transition-colors"
                    style={{
                      borderColor: docType === opt.value ? '#C9A84C' : 'rgba(245,240,232,0.08)',
                      backgroundColor: docType === opt.value ? 'rgba(201,168,76,0.06)' : 'transparent',
                    }}
                  >
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 500, color: docType === opt.value ? '#C9A84C' : '#f5f0e8' }}>
                      {opt.label}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', color: 'rgba(245,240,232,0.38)', marginTop: '3px', lineHeight: 1.4 }}>
                      {opt.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* File picker */}
            <div className="mb-5">
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 500, color: 'rgba(245,240,232,0.65)', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
                Select file <span style={{ color: 'rgba(245,240,232,0.3)', fontWeight: 300 }}>(PDF, DOCX, or TXT — max 20MB)</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  selectedFile.current = f;
                  const label = document.getElementById('chosen-file-name');
                  if (label) label.textContent = f ? f.name : 'No file chosen';
                }}
                style={{ display: 'none' }}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 border px-4 py-2.5 transition-colors hover:bg-[rgba(245,240,232,0.03)]"
                  style={{ borderColor: 'rgba(245,240,232,0.12)', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.72)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  Choose file
                </button>
                <span id="chosen-file-name" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(245,240,232,0.38)' }}>
                  No file chosen
                </span>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={stage === 'uploading'}
              className="flex items-center gap-2 px-5 py-2.5 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#C9A84C', color: '#0a0a0a', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              {stage === 'uploading' ? (
                <>
                  <span className="animate-pulse">Extracting fields…</span>
                </>
              ) : 'Extract fields →'}
            </button>
          </>
        )}

        {/* ── Stage: reviewing ── */}
        {stage === 'reviewing' && (
          <>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.6)', marginBottom: '16px', lineHeight: 1.6 }}>
              {fields.length} field{fields.length !== 1 ? 's' : ''} extracted. Select which to apply — you can edit any field after saving.
            </p>

            <div className="mb-5">
              {fields.map(field => {
                const isAccepted = accepted.has(field.key);
                return (
                  <div
                    key={field.key}
                    className="flex items-start gap-3 border-b py-3 cursor-pointer"
                    style={{ borderColor: 'rgba(201,168,76,0.07)' }}
                    onClick={() => toggleField(field.key)}
                  >
                    {/* Checkbox */}
                    <div
                      className="mt-0.5 shrink-0 flex items-center justify-center"
                      style={{
                        width: '16px', height: '16px',
                        border: `1px solid ${isAccepted ? '#C9A84C' : 'rgba(245,240,232,0.2)'}`,
                        backgroundColor: isAccepted ? 'rgba(201,168,76,0.15)' : 'transparent',
                        flexShrink: 0,
                      }}
                    >
                      {isAccepted && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(245,240,232,0.45)', fontWeight: 400, marginBottom: '2px' }}>
                        {field.label}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: isAccepted ? '#f5f0e8' : 'rgba(245,240,232,0.35)', fontWeight: 300 }}>
                        {field.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleApply}
                disabled={accepted.size === 0}
                className="px-5 py-2.5 transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#C9A84C', color: '#0a0a0a', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Apply {accepted.size} field{accepted.size !== 1 ? 's' : ''} →
              </button>
              <button
                onClick={() => { setAccepted(new Set(fields.map(f => f.key))); }}
                className="px-4 py-2.5 border transition-colors hover:bg-[rgba(245,240,232,0.03)]"
                style={{ borderColor: 'rgba(245,240,232,0.1)', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.55)' }}
              >
                Select all
              </button>
              <button
                onClick={reset}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Start over
              </button>
            </div>
          </>
        )}

        {/* ── Stage: done ── */}
        {stage === 'done' && (
          <div className="py-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex shrink-0 items-center justify-center"
                style={{ width: '28px', height: '28px', border: '1px solid rgba(74,222,128,0.35)', backgroundColor: 'rgba(74,222,128,0.08)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#f5f0e8' }}>
                {savedCount} field{savedCount !== 1 ? 's' : ''} saved to your application
              </p>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.6, marginBottom: '16px' }}>
              Each field is tagged &ldquo;From your documents&rdquo; and can be edited at any time within the relevant section.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { reset(); setIsOpen(false); }}
                className="px-4 py-2 border transition-colors hover:bg-[rgba(245,240,232,0.03)]"
                style={{ borderColor: 'rgba(245,240,232,0.1)', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.55)' }}
              >
                Close
              </button>
              <button
                onClick={reset}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(201,168,76,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Import another document
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: error ── */}
        {stage === 'error' && (
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(248,113,113,0.85)', marginBottom: '12px' }}>
              {errorMsg}
            </p>
            <button
              onClick={reset}
              className="px-4 py-2.5 border transition-colors hover:bg-[rgba(245,240,232,0.03)]"
              style={{ borderColor: 'rgba(245,240,232,0.1)', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.6)' }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
