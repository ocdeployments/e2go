'use client';

import { useState, useRef, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { ExtractedField, ParseDocumentResponse } from '@/app/api/apply/parse-document/route';

interface DocumentImportHubProps {
  applicationId: string | null;
  onFieldsApplied?: (count: number) => void;
}

type HubStage = 'idle' | 'processing' | 'processed' | 'reviewing' | 'saving' | 'done' | 'error';

const DOC_TYPE_OPTIONS = [
  { value: 'auto',                   label: 'Detect automatically',            hint: 'App identifies the document type for you' },
  { value: 'resume',                 label: 'Resume / CV',                    hint: 'Name, education, experience, skills' },
  { value: 'fdd',                    label: 'Franchise Disclosure Document',   hint: 'Brand, investment range, fees, term, territory, financials' },
  { value: 'investment_records',     label: 'Bank / Investment Records',       hint: 'Best with account summary PDF or CSV export — not a full transaction history' },
  { value: 'business_plan',          label: 'Business Plan',                   hint: 'Business name, location, employees, revenue projections' },
  { value: 'financial_statement',    label: 'Personal Financial Statement',    hint: 'Net worth, liquid assets, property' },
  { value: 'territory_analysis',     label: 'Territory / Market Analysis',     hint: 'Target location, ZIP, business category' },
  { value: 'passport',               label: 'Passport',                        hint: 'Name, DOB, nationality, passport number, expiry' },
  { value: 'franchise_agreement',    label: 'Franchise Agreement (signed)',     hint: 'Agreement date, territory, fees, term' },
  { value: 'lease_agreement',        label: 'Lease Agreement',                 hint: 'Business address, rent, lease term' },
  { value: 'acquisition_financials', label: 'Acquisition Financials',          hint: 'Purchase price, 3-year P&L, employees' },
  { value: 'government_form',        label: 'Government Form (DS-160, G-28…)', hint: 'Applicant info, visa type, business details' },
] as const;

type DocTypeValue = typeof DOC_TYPE_OPTIONS[number]['value'];

// ─── Queue types ─────────────────────────────────────────────────────────────

interface QueuedFile {
  id: string;
  file: File;
  docType: DocTypeValue;
  status: 'pending' | 'processing' | 'done' | 'error';
  fields?: ExtractedField[];
  totalFields?: number;
  resolvedDocType?: string;
  docId?: string | null;
  error?: string;
}

// ─── Merged-review types ─────────────────────────────────────────────────────

interface FieldSource {
  value: string;
  docType: string;
  fileName: string;
  docId: string | null;
}

interface MergedField {
  key: string;
  label: string;
  sources: FieldSource[];
  /** true when 2+ sources disagree on the value */
  isConflict: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function docTypeLabel(value: string): string {
  return DOC_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

// Which document type is authoritative for each question key.
// When multiple documents provide the same key, the highest-ranking source wins
// automatically — no conflict shown to the user.
const SOURCE_PRIORITY: Record<string, string[]> = {
  // Brand / franchise type: FDD or franchise agreement, never a resume job title
  'M3-Q-00':            ['franchise_agreement', 'fdd', 'business_plan'],
  // Entity name: applicant's LLC (business plan / franchise agreement) beats FDD franchisor entity
  'M3-E-01':            ['franchise_agreement', 'business_plan', 'government_form', 'acquisition_financials', 'fdd'],
  // Personal identity: passport is ground truth
  'M3-A-01':            ['passport', 'government_form', 'resume'],
  'M3-A-DOB':           ['passport', 'government_form'],
  'M3-A-NATIONALITY':   ['passport', 'government_form'],
  'M3-A-CITIZENSHIP':   ['passport', 'government_form'],
  'M3-A-PASSPORT':      ['passport', 'government_form'],
  'M3-A-PASSPORT-EXP':  ['passport', 'government_form'],
  'M3-A-BIRTH-COUNTRY': ['passport', 'government_form'],
  // Client's capital: financial statement > investment records > business plan (FDD excluded — it's system avg)
  'M3-F-02':            ['financial_statement', 'investment_records', 'business_plan'],
  // Source of funds: detailed fund flow doc beats general net worth narrative
  'M3-F-SRC':           ['investment_records', 'financial_statement'],
  // Net worth: financial statement is canonical
  'M3-F-04':            ['financial_statement', 'investment_records'],
  // Franchise fee: signed agreement > FDD (signed overrides disclosed)
  'M3-F-03':            ['franchise_agreement', 'fdd', 'investment_records'],
  // Business description: business plan (specific to this case) > FDD (generic system)
  'M3-B-01':            ['business_plan', 'fdd'],
  // Target location: lease > territory analysis > business plan (FDD HQ excluded)
  'M3-B-02':            ['lease_agreement', 'territory_analysis', 'business_plan', 'franchise_agreement'],
  'M3-G-ADDRESS':       ['lease_agreement', 'franchise_agreement', 'business_plan'],
  'M3-G-RENT':          ['lease_agreement'],
  'M3-G-LEASE-TERM':    ['lease_agreement', 'franchise_agreement'],
  // Employees: business plan's projection > FDD system average
  'M3-B-03':            ['business_plan', 'acquisition_financials', 'fdd'],
  // Franchise terms: signed agreement supersedes FDD
  'M3-FDD-TERM':        ['franchise_agreement', 'fdd'],
  'M3-FDD-ROYALTY':     ['franchise_agreement', 'fdd'],
  // Revenue: business plan projection > FDD Item 19 average
  'M3-I-01':            ['business_plan', 'acquisition_financials', 'fdd'],
};

// Normalize values before comparing — strips symbols and common entity suffixes
// so "450,000" vs "450000" or "Care Shepherds LLC" vs "Care Shepherds" don't falsely conflict.
function normalizeForComparison(v: string): string {
  return v
    .toLowerCase()
    .replace(/[$%,]/g, '')
    .replace(/\s+(llc|inc|ltd|corp|co)\.?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeFields(queue: QueuedFile[]): MergedField[] {
  const map = new Map<string, MergedField>();

  for (const item of queue) {
    if (!item.fields) continue;
    const resolvedType = item.resolvedDocType ?? item.docType;
    for (const f of item.fields) {
      if (!map.has(f.key)) {
        map.set(f.key, { key: f.key, label: f.label, sources: [], isConflict: false });
      }
      map.get(f.key)!.sources.push({
        value:    f.value,
        docType:  resolvedType,
        fileName: item.file.name,
        docId:    item.docId ?? null,
      });
    }
  }

  for (const entry of map.values()) {
    if (entry.sources.length <= 1) continue;

    const priority = SOURCE_PRIORITY[entry.key];
    if (priority) {
      // Walk priority list — first matching source with a value wins
      const winner = priority
        .flatMap(pt => entry.sources.filter(s => s.docType === pt))
        .find(s => s.value.trim() !== '');

      if (winner) {
        // Reorder so winner is first (the reviewing stage reads sources[0] as the accepted value)
        entry.sources = [winner, ...entry.sources.filter(s => s !== winner)];
        entry.isConflict = false;
        continue;
      }
    }

    // No priority defined — compare normalized values; only flag as conflict if genuinely different
    const unique = new Set(entry.sources.map(s => normalizeForComparison(s.value)));
    entry.isConflict = unique.size > 1;
  }

  return Array.from(map.values());
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentImportHub({ applicationId, onFieldsApplied }: DocumentImportHubProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen,    setIsOpen]    = useState(false);
  const [stage,     setStage]     = useState<HubStage>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [queue,     setQueue]     = useState<QueuedFile[]>([]);
  const [merged,    setMerged]    = useState<MergedField[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  // Review state
  const [accepted,        setAccepted]        = useState<Set<string>>(new Set());
  const [conflictChoices, setConflictChoices] = useState<Map<string, string>>(new Map()); // key → chosen value
  const [manualValues,    setManualValues]    = useState<Map<string, string>>(new Map()); // key → manual text

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    setStage('idle');
    setErrorMsg('');
    setQueue([]);
    setMerged([]);
    setAccepted(new Set());
    setConflictChoices(new Map());
    setManualValues(new Map());
    setSavedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Add files from picker ─────────────────────────────────────────────────

  const handleFilesChosen = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: QueuedFile[] = Array.from(files).map(f => ({
      id:      uid(),
      file:    f,
      docType: 'auto',
      status:  'pending',
    }));
    setQueue(prev => [...prev, ...newItems]);
    // Reset the input so the same file can be re-added if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  function removeFromQueue(id: string) {
    setQueue(prev => prev.filter(f => f.id !== id));
  }

  function setQueueDocType(id: string, docType: DocTypeValue) {
    setQueue(prev => prev.map(f => f.id === id ? { ...f, docType } : f));
  }

  // ── Batch extraction ──────────────────────────────────────────────────────

  async function handleExtractAll() {
    if (queue.length === 0) return;
    setStage('processing');
    setErrorMsg('');

    const updated = [...queue];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      // Mark processing
      updated[i] = { ...item, status: 'processing' };
      setQueue([...updated]);

      const fd = new FormData();
      fd.append('file',    item.file);
      fd.append('docType', item.docType);
      if (applicationId) fd.append('applicationId', applicationId);

      try {
        const res  = await fetch('/api/apply/parse-document', { method: 'POST', body: fd });
        const data: ParseDocumentResponse & { error?: string } = await res.json();

        if (!res.ok || data.error) {
          updated[i] = { ...updated[i], status: 'error', error: data.error ?? 'Extraction failed' };
        } else {
          updated[i] = {
            ...updated[i],
            status:          'done',
            fields:          data.fields,
            totalFields:     data.totalFields,
            resolvedDocType: data.docType,
            docId:           data.docId,
          };
        }
      } catch {
        updated[i] = { ...updated[i], status: 'error', error: 'Network error' };
      }

      setQueue([...updated]);
    }

    // Build merged review from successful extractions
    const successful = updated.filter(f => f.status === 'done');
    if (successful.length === 0) {
      setErrorMsg('No fields could be extracted from any document.');
      setStage('error');
      return;
    }

    const mergedFields = mergeFields(updated);
    setMerged(mergedFields);

    // Default-accept all non-conflict fields
    const autoAccepted = new Set(
      mergedFields.filter(f => !f.isConflict).map(f => f.key)
    );
    setAccepted(autoAccepted);
    setConflictChoices(new Map());
    setManualValues(new Map());

    // Stop at 'processed' so the user can see per-file results before reviewing.
    // The "Review fields →" button transitions to 'reviewing'.
    setStage('processed');
  }

  // ── Review interactions ───────────────────────────────────────────────────

  function toggleAccepted(key: string) {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function setConflictChoice(key: string, value: string) {
    setConflictChoices(prev => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }

  function setManualValue(key: string, val: string) {
    setManualValues(prev => { const n = new Map(prev); n.set(key, val); return n; });
  }

  // ── Apply ─────────────────────────────────────────────────────────────────

  async function handleApply() {
    // Resolve final field list
    const toApply: { key: string; value: string }[] = [];

    for (const f of merged) {
      if (f.isConflict) {
        const choice = conflictChoices.get(f.key);
        if (!choice) continue; // unresolved conflict — skip
        if (choice === '__manual__') {
          const manual = manualValues.get(f.key)?.trim();
          if (!manual) continue;
          toApply.push({ key: f.key, value: manual });
        } else {
          toApply.push({ key: f.key, value: choice });
        }
      } else {
        if (!accepted.has(f.key)) continue;
        toApply.push({ key: f.key, value: f.sources[0].value });
      }
    }

    if (toApply.length === 0) return;
    setStage('saving');

    const saveTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 20000)
    );

    async function doSave() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErrorMsg('Session expired. Please refresh.'); setStage('error'); return; }

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

      const upserts = toApply.map(f => ({
        application_id:       appId!,
        question_key:         f.key,
        answer_value:         f.value,
        source_document_type: 'document_upload',
        answered_at:          new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from('answers')
        .upsert(upserts, { onConflict: 'application_id,question_key' });

      if (upsertErr) { setErrorMsg(`Failed to save: ${upsertErr.message}`); setStage('error'); return; }

      // Update accepted-count on all upload records in parallel
      const docUpdates = queue
        .filter(item => item.docId)
        .map(item => {
          const count = toApply.filter(f => {
            const mf = merged.find(m => m.key === f.key);
            return mf?.sources.some(s => s.docId === item.docId) ?? false;
          }).length;
          return supabase
            .from('uploaded_documents')
            .update({ fields_accepted: count })
            .eq('id', item.docId!);
        });
      await Promise.all(docUpdates);

      setSavedCount(toApply.length);
      setStage('done');
      onFieldsApplied?.(toApply.length);
    }

    try {
      await Promise.race([doSave(), saveTimeout]);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout';
      setErrorMsg(isTimeout
        ? 'Save timed out — check your connection and try again.'
        : 'Unexpected error. Please try again.'
      );
      setStage('error');
    }
  }

  // Count how many conflict fields still need resolution
  const unresolvedConflicts = merged.filter(
    f => f.isConflict && !conflictChoices.has(f.key)
  ).length;

  const applyCount =
    accepted.size +
    [...conflictChoices.entries()].filter(([key, val]) => {
      if (val === '__manual__') return !!(manualValues.get(key)?.trim());
      return true;
    }).length;

  // ── Closed state ──────────────────────────────────────────────────────────

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
            Import from documents
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

  // ── Open panel ────────────────────────────────────────────────────────────

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
          Import from documents
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

        {/* ── Stage: idle — queue builder ──────────────────────────────────── */}
        {stage === 'idle' && (
          <>
            {/* Hidden multi-file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.csv"
              multiple
              onChange={e => handleFilesChosen(e.target.files)}
              style={{ display: 'none' }}
            />

            {/* Drop zone / Add files button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-dashed flex flex-col items-center justify-center gap-2 py-8 mb-5 transition-colors hover:bg-[rgba(201,168,76,0.03)]"
              style={{ borderColor: 'rgba(201,168,76,0.2)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.55)' }}>
                Click to add files <span style={{ color: 'rgba(245,240,232,0.3)' }}>— PDF, DOCX, or TXT, max 20 MB each</span>
              </p>
              {queue.length > 0 && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(201,168,76,0.6)' }}>
                  Add more files
                </p>
              )}
            </button>

            {/* Queue list */}
            {queue.length > 0 && (
              <div className="mb-5">
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 500, color: 'rgba(245,240,232,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  {queue.length} file{queue.length !== 1 ? 's' : ''} queued
                </p>
                <div className="flex flex-col gap-2">
                  {queue.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 border p-3"
                      style={{ borderColor: 'rgba(245,240,232,0.07)', backgroundColor: 'rgba(0,0,0,0.15)' }}
                    >
                      {/* File icon */}
                      <div
                        className="shrink-0 flex items-center justify-center"
                        style={{ width: '28px', height: '28px', border: '1px solid rgba(201,168,76,0.15)', marginTop: '2px' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#f5f0e8', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                          {item.file.name}
                        </p>
                        {/* Per-file doc type */}
                        <select
                          value={item.docType}
                          onChange={e => setQueueDocType(item.id, e.target.value as DocTypeValue)}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize:   '11px',
                            color:      'rgba(245,240,232,0.7)',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            border:     '1px solid rgba(245,240,232,0.1)',
                            padding:    '4px 8px',
                            cursor:     'pointer',
                            width:      '100%',
                            maxWidth:   '260px',
                          }}
                        >
                          {DOC_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        aria-label="Remove file"
                        style={{ color: 'rgba(245,240,232,0.25)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', lineHeight: 1, paddingTop: '2px', flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extract button */}
            {queue.length > 0 && (
              <button
                onClick={handleExtractAll}
                className="flex items-center gap-2 px-5 py-2.5"
                style={{ backgroundColor: '#C9A84C', color: '#0a0a0a', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Extract fields from {queue.length} file{queue.length !== 1 ? 's' : ''} →
              </button>
            )}
          </>
        )}

        {/* ── Stage: processing ────────────────────────────────────────────── */}
        {stage === 'processing' && (
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.55)', marginBottom: '16px' }}>
              Extracting fields — please wait…
            </p>
            <div className="flex flex-col gap-2">
              {queue.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border p-3"
                  style={{ borderColor: 'rgba(245,240,232,0.07)', backgroundColor: 'rgba(0,0,0,0.15)' }}
                >
                  {/* Status indicator */}
                  <div style={{ width: '18px', height: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.status === 'pending' && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(245,240,232,0.2)' }} />
                    )}
                    {item.status === 'processing' && (
                      <div style={{ width: '14px', height: '14px', border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    )}
                    {item.status === 'done' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {item.status === 'error' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: item.status === 'error' ? 'rgba(248,113,113,0.8)' : '#f5f0e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.file.name}
                    </p>
                    {item.status === 'done' && item.fields && (
                      <div style={{ marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(74,222,128,0.8)' }}>
                          {item.fields.length} intake field{item.fields.length !== 1 ? 's' : ''}
                        </span>
                        {item.totalFields !== undefined && (
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(201,168,76,0.6)' }}>
                            · {item.totalFields} total stored
                          </span>
                        )}
                        {item.resolvedDocType && item.docType === 'auto' && (
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', color: 'rgba(245,240,232,0.3)', letterSpacing: '0.04em' }}>
                            · detected as {docTypeLabel(item.resolvedDocType)}
                          </span>
                        )}
                      </div>
                    )}
                    {item.status === 'error' && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(248,113,113,0.7)', marginTop: '2px' }}>
                        {item.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Stage: processed — results summary, stays until user continues ── */}
        {stage === 'processed' && (
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.55)', marginBottom: '14px' }}>
              Extraction complete — review the results below before continuing.
            </p>

            <div className="flex flex-col gap-2 mb-5">
              {queue.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border p-3"
                  style={{
                    borderColor:     item.status === 'error' ? 'rgba(248,113,113,0.2)' : item.status === 'done' ? 'rgba(74,222,128,0.15)' : 'rgba(245,240,232,0.07)',
                    backgroundColor: item.status === 'error' ? 'rgba(248,113,113,0.05)' : 'rgba(0,0,0,0.15)',
                  }}
                >
                  <div style={{ width: '18px', height: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.status === 'done' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {item.status === 'error' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: item.status === 'error' ? 'rgba(248,113,113,0.85)' : '#f5f0e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.file.name}
                    </p>
                    {item.status === 'done' && item.fields && (
                      <div style={{ marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(74,222,128,0.85)', fontWeight: 500 }}>
                          {item.fields.length} intake field{item.fields.length !== 1 ? 's' : ''}
                        </span>
                        {item.totalFields !== undefined && (
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(201,168,76,0.7)' }}>
                            · {item.totalFields} total fields stored
                          </span>
                        )}
                        {item.resolvedDocType && item.docType === 'auto' && (
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', color: 'rgba(245,240,232,0.35)', letterSpacing: '0.04em' }}>
                            · detected as {docTypeLabel(item.resolvedDocType)}
                          </span>
                        )}
                      </div>
                    )}
                    {item.status === 'error' && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(248,113,113,0.7)', marginTop: '2px' }}>
                        {item.error ?? 'No fields found in this document'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setStage('reviewing')}
                className="flex items-center gap-2 px-5 py-2.5"
                style={{ backgroundColor: '#C9A84C', color: '#0a0a0a', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Review {merged.length} field{merged.length !== 1 ? 's' : ''} →
              </button>
              <button
                onClick={reset}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: reviewing ─────────────────────────────────────────────── */}
        {stage === 'reviewing' && (
          <>
            <div className="mb-4">
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.6 }}>
                {merged.length} field{merged.length !== 1 ? 's' : ''} extracted across {queue.filter(q => q.status === 'done').length} document{queue.filter(q => q.status === 'done').length !== 1 ? 's' : ''}.
                {unresolvedConflicts > 0 && (
                  <span style={{ color: 'rgba(251,191,36,0.85)', marginLeft: '6px' }}>
                    {unresolvedConflicts} field{unresolvedConflicts !== 1 ? 's' : ''} need{unresolvedConflicts === 1 ? 's' : ''} your input — documents disagree on the value.
                  </span>
                )}
              </p>
            </div>

            <div className="mb-5">
              {merged.map(field => {
                const isAccepted = accepted.has(field.key);
                const choice     = conflictChoices.get(field.key);
                const isManual   = choice === '__manual__';

                if (field.isConflict) {
                  // ── Conflict field: forced radio choice ──
                  return (
                    <div
                      key={field.key}
                      className="border-b py-4"
                      style={{ borderColor: 'rgba(201,168,76,0.1)' }}
                    >
                      {/* Field label + conflict badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(245,240,232,0.5)', fontWeight: 400 }}>
                          {field.label}
                        </p>
                        <span style={{ fontSize: '10px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(251,191,36,0.8)', backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', padding: '1px 6px', letterSpacing: '0.04em' }}>
                          CONFLICT — choose one
                        </span>
                      </div>

                      {/* One radio per source */}
                      <div className="flex flex-col gap-2 mb-2">
                        {field.sources.map((src, idx) => {
                          const isChosen = choice === src.value;
                          return (
                            <button
                              key={idx}
                              onClick={() => setConflictChoice(field.key, src.value)}
                              className="flex items-start gap-3 border p-3 text-left transition-colors"
                              style={{
                                borderColor:     isChosen ? '#C9A84C' : 'rgba(245,240,232,0.08)',
                                backgroundColor: isChosen ? 'rgba(201,168,76,0.06)' : 'transparent',
                              }}
                            >
                              {/* Radio dot */}
                              <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `1px solid ${isChosen ? '#C9A84C' : 'rgba(245,240,232,0.2)'}`, backgroundColor: isChosen ? '#C9A84C' : 'transparent', flexShrink: 0, marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isChosen && <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#0a0a0a' }} />}
                              </div>
                              <div>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: isChosen ? '#f5f0e8' : 'rgba(245,240,232,0.55)', fontWeight: 300, marginBottom: '2px' }}>
                                  {src.value}
                                </p>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', color: 'rgba(245,240,232,0.3)' }}>
                                  from {src.fileName}
                                </p>
                              </div>
                            </button>
                          );
                        })}

                        {/* Enter manually option */}
                        <button
                          onClick={() => setConflictChoice(field.key, '__manual__')}
                          className="flex items-start gap-3 border p-3 text-left transition-colors"
                          style={{
                            borderColor:     isManual ? 'rgba(245,240,232,0.35)' : 'rgba(245,240,232,0.06)',
                            backgroundColor: isManual ? 'rgba(245,240,232,0.03)' : 'transparent',
                          }}
                        >
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `1px solid ${isManual ? 'rgba(245,240,232,0.6)' : 'rgba(245,240,232,0.2)'}`, backgroundColor: isManual ? 'rgba(245,240,232,0.6)' : 'transparent', flexShrink: 0, marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isManual && <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#0a0a0a' }} />}
                          </div>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: isManual ? 'rgba(245,240,232,0.75)' : 'rgba(245,240,232,0.3)', fontWeight: 300 }}>
                            Enter manually
                          </p>
                        </button>
                      </div>

                      {/* Manual text input */}
                      {isManual && (
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type the correct value…"
                          value={manualValues.get(field.key) ?? ''}
                          onChange={e => setManualValue(field.key, e.target.value)}
                          style={{
                            width:           '100%',
                            fontFamily:      "'DM Sans', sans-serif",
                            fontSize:        '13px',
                            color:           '#f5f0e8',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            border:          '1px solid rgba(201,168,76,0.25)',
                            padding:         '8px 12px',
                            outline:         'none',
                            marginTop:       '6px',
                          }}
                        />
                      )}
                    </div>
                  );
                }

                // ── Non-conflict field: checkbox ──
                return (
                  <div
                    key={field.key}
                    className="flex items-start gap-3 border-b py-3 cursor-pointer"
                    style={{ borderColor: 'rgba(201,168,76,0.07)' }}
                    onClick={() => toggleAccepted(field.key)}
                  >
                    <div
                      className="mt-0.5 shrink-0 flex items-center justify-center"
                      style={{
                        width:           '16px',
                        height:          '16px',
                        border:          `1px solid ${isAccepted ? '#C9A84C' : 'rgba(245,240,232,0.2)'}`,
                        backgroundColor: isAccepted ? 'rgba(201,168,76,0.15)' : 'transparent',
                        flexShrink:      0,
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
                        {field.sources.length > 0 && (
                          <span style={{ color: 'rgba(245,240,232,0.25)', marginLeft: '6px', fontSize: '10px' }}>
                            from {field.sources[0].fileName}
                          </span>
                        )}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: isAccepted ? '#f5f0e8' : 'rgba(245,240,232,0.35)', fontWeight: 300 }}>
                        {field.sources[0]?.value}
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
                disabled={applyCount === 0 || unresolvedConflicts > 0}
                className="px-5 py-2.5 transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#C9A84C', color: '#0a0a0a', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                {unresolvedConflicts > 0
                  ? `Resolve ${unresolvedConflicts} conflict${unresolvedConflicts !== 1 ? 's' : ''} to continue`
                  : `Apply ${applyCount} field${applyCount !== 1 ? 's' : ''} →`}
              </button>
              <button
                onClick={() => {
                  setAccepted(new Set(merged.filter(f => !f.isConflict).map(f => f.key)));
                }}
                className="px-4 py-2.5 border transition-colors hover:bg-[rgba(245,240,232,0.03)]"
                style={{ borderColor: 'rgba(245,240,232,0.1)', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.55)' }}
              >
                Select all non-conflicts
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

        {/* ── Stage: saving ────────────────────────────────────────────────── */}
        {stage === 'saving' && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.55)' }} className="animate-pulse">
            Saving fields…
          </p>
        )}

        {/* ── Stage: done ──────────────────────────────────────────────────── */}
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
                Import more documents
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: error ─────────────────────────────────────────────────── */}
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
