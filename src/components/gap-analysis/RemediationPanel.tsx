'use client';

import { useState, useRef, useCallback } from 'react';
import type {
  DenialRiskFactor,
  DCodeRemediation,
  RemediationField,
  RemediationDoc,
} from '@/lib/gap-analysis-engine';

interface DocRow {
  detected_document_type?: string | null;
  user_selected_document_type?: string | null;
}

interface RemediationPanelProps {
  factor: DenialRiskFactor;
  remediation: DCodeRemediation;
  localAnswers: Map<string, string>;
  localDocs: DocRow[];
  appId: string;
  onAnswerChange: (key: string, value: string) => void;
  onDocUploaded: (docType: string) => void;
  riskColor: string;
}

function docIsPresent(docType: string, docs: DocRow[]): boolean {
  return docs.some(d => {
    const t = (d.detected_document_type || d.user_selected_document_type || '').toLowerCase();
    return t.includes(docType.toLowerCase());
  });
}

// Quality check for textarea answers — presence alone isn't enough.
const FILLER_PHRASES = ['not sure', "don't know", 'tbd', 'n/a', 'none', 'na', 'will add later', 'coming soon', 'todo', 'unknown', 'not yet'];
function getTextQuality(value: string, inputType: string): 'empty' | 'weak' | 'strong' {
  const v = value.trim();
  if (v.length <= 3) return 'empty';
  if (inputType !== 'textarea') return v.length > 0 ? 'strong' : 'empty';
  if (FILLER_PHRASES.some(p => v.toLowerCase().includes(p)) && v.length < 40) return 'weak';
  if (v.split(/\s+/).length < 5) return 'weak';
  return 'strong';
}

interface CompletionItem { label: string; complete: boolean; quality?: 'weak' | 'strong' }

function computeCompletion(
  remediation: DCodeRemediation,
  localAnswers: Map<string, string>,
  localDocs: DocRow[],
): { done: number; total: number; items: CompletionItem[] } {
  const items: CompletionItem[] = [];
  for (const f of remediation.fields) {
    const val = localAnswers.get(f.key) ?? '';
    const quality = getTextQuality(val, f.inputType);
    items.push({ label: f.label, complete: quality === 'strong', quality: quality === 'empty' ? undefined : quality });
  }
  for (const d of remediation.docs) {
    items.push({ label: d.label, complete: docIsPresent(d.docType, localDocs) });
  }
  const done = items.filter(i => i.complete).length;
  return { done, total: items.length, items };
}

export default function RemediationPanel({
  factor: _factor,
  remediation,
  localAnswers,
  localDocs,
  appId,
  onAnswerChange,
  onDocUploaded,
  riskColor,
}: RemediationPanelProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { done, total, items } = computeCompletion(remediation, localAnswers, localDocs);
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const saveField = useCallback(async (key: string, value: string) => {
    setSaveStatus('saving');
    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_key: key, answer_value: value, application_id: appId }),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch {
      setSaveStatus('idle');
    }
  }, [appId]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    onAnswerChange(key, value);
    const existing = debounceRefs.current.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => saveField(key, value), 800);
    debounceRefs.current.set(key, timer);
  }, [onAnswerChange, saveField]);

  const handleFileUpload = useCallback(async (file: File, docType: string) => {
    setUploadingDocType(docType);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('applicationId', appId);
      fd.append('file_0', file);
      fd.append('type_0', docType);
      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || 'Upload failed');
      }
      onDocUploaded(docType);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed — try again');
    } finally {
      setUploadingDocType(null);
    }
  }, [appId, onDocUploaded]);

  // Incomplete fields and docs — only show what still needs doing
  const incompleteFields = remediation.fields.filter(
    f => (localAnswers.get(f.key)?.trim().length ?? 0) <= 3
  );
  const missingDocs = remediation.docs.filter(d => !docIsPresent(d.docType, localDocs));

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '14px 16px',
        background: `${riskColor}06`,
        border: `1px solid ${riskColor}20`,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Completion status ─────────────────────────────────────────── */}
      {total > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(245,240,232,0.72)' }}>
              PROGRESS
            </span>
            <span style={{ fontSize: '11px', color: done === total ? '#22c55e' : 'rgba(245,240,232,0.4)' }}>
              {done} of {total} complete
            </span>
          </div>
          <div style={{ height: '3px', background: 'rgba(245,240,232,0.08)', borderRadius: '2px' }}>
            <div style={{
              height: '100%', width: `${progressPct}%`,
              background: done === total ? '#22c55e' : riskColor,
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Checklist ─────────────────────────────────────────────────── */}
      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
          {items.map(item => {
            const icon = item.complete ? '✓' : item.quality === 'weak' ? '⚠' : '○';
            const iconColor = item.complete ? '#22c55e' : item.quality === 'weak' ? '#f59e0b' : 'rgba(245,240,232,0.65)';
            const textColor = item.complete ? 'rgba(245,240,232,0.72)' : item.quality === 'weak' ? 'rgba(245,240,232,0.75)' : 'rgba(245,240,232,0.65)';
            return (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ flexShrink: 0, marginTop: '1px', fontSize: '12px', color: iconColor }}>
                  {icon}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', lineHeight: 1.4, color: textColor, textDecoration: item.complete ? 'line-through' : 'none' }}>
                    {item.label}
                  </span>
                  {item.quality === 'weak' && !item.complete && (
                    <span style={{ display: 'block', fontSize: '10px', color: '#f59e0b', marginTop: '1px' }}>
                      Too brief — add more specific detail
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Done-when condition ────────────────────────────────────────── */}
      <div style={{
        fontSize: '10px', letterSpacing: '0.08em', fontWeight: 600,
        color: 'rgba(201,168,76,0.6)', marginBottom: '14px',
      }}>
        DONE WHEN: <span style={{ fontWeight: 400, letterSpacing: 0 }}>{remediation.lowRiskWhen}</span>
      </div>

      {/* ── Inline fields (fields mode only, incomplete only) ─────────── */}
      {remediation.mode === 'fields' && incompleteFields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
          {incompleteFields.map(f => (
            <InlineField
              key={f.key}
              field={f}
              value={localAnswers.get(f.key) ?? ''}
              onChange={v => handleFieldChange(f.key, v)}
            />
          ))}
        </div>
      )}

      {/* ── Inline doc upload (fields mode only, missing docs only) ───── */}
      {remediation.mode === 'fields' && missingDocs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {missingDocs.map(d => (
            <DocUploadRow
              key={d.docType}
              doc={d}
              uploading={uploadingDocType === d.docType}
              onFile={file => handleFileUpload(file, d.docType)}
            />
          ))}
          {uploadError && (
            <p style={{ fontSize: '11px', color: '#ef4444', margin: 0 }}>{uploadError}</p>
          )}
        </div>
      )}

      {/* ── Simulator mode ────────────────────────────────────────────── */}
      {remediation.mode === 'simulator' && (
        <div style={{ padding: '12px 14px', background: 'rgba(245,240,232,0.03)', border: '1px solid rgba(245,240,232,0.07)' }}>
          <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.6, margin: '0 0 10px' }}>
            {remediation.simulatorNote}
          </p>
          <a
            href="/simulator"
            style={{ fontSize: '11px', fontWeight: 600, color: riskColor, textDecoration: 'none', borderBottom: `1px solid ${riskColor}50`, paddingBottom: '1px' }}
          >
            Open Simulator →
          </a>
        </div>
      )}

      {/* ── Structural mode ───────────────────────────────────────────── */}
      {remediation.mode === 'structural' && (
        <div style={{ padding: '12px 14px', background: 'rgba(245,240,232,0.03)', border: '1px solid rgba(245,240,232,0.07)' }}>
          <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.6, margin: '0 0 10px' }}>
            {remediation.structuralExplanation}
          </p>
          <a
            href="/apply/business"
            style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(201,168,76,0.7)', textDecoration: 'none', borderBottom: '1px solid rgba(201,168,76,0.3)', paddingBottom: '1px' }}
          >
            Review business type →
          </a>
        </div>
      )}

      {/* ── Save status indicator ─────────────────────────────────────── */}
      {saveStatus !== 'idle' && (
        <div style={{ fontSize: '10px', letterSpacing: '0.06em', color: saveStatus === 'saved' ? '#22c55e' : 'rgba(245,240,232,0.70)', marginTop: '8px' }}>
          {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
        </div>
      )}

      {/* ── All done state ────────────────────────────────────────────── */}
      {done === total && total > 0 && remediation.mode === 'fields' && (
        <div style={{
          marginTop: '12px', padding: '10px 12px',
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
          fontSize: '12px', color: 'rgba(34,197,94,0.8)', lineHeight: 1.5,
        }}>
          ✓ All items complete — this risk factor should now score lower. The score above updates live.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// InlineField — renders one question as an input, textarea, or select
// =============================================================================

interface InlineFieldProps {
  field: RemediationField;
  value: string;
  onChange: (value: string) => void;
}

function InlineField({ field, value, onChange }: InlineFieldProps) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(245,240,232,0.04)',
    border: '1px solid rgba(245,240,232,0.12)',
    color: '#f5f0e8',
    fontSize: '12px',
    fontFamily: "'DM Sans', sans-serif",
    padding: '8px 10px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(245,240,232,0.78)', marginBottom: '5px', lineHeight: 1.4 }}>
        {field.label}
      </label>
      {field.inputType === 'select' ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Select…</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.inputType === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      ) : (
        <input
          type={field.inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );
}

// =============================================================================
// DocUploadRow — renders one document upload row
// =============================================================================

interface DocUploadRowProps {
  doc: RemediationDoc;
  uploading: boolean;
  onFile: (file: File) => void;
}

function DocUploadRow({ doc, uploading, onFile }: DocUploadRowProps) {
  const inputId = `upload-${doc.docType.replace(/\s+/g, '-')}`;

  return (
    <div onClick={e => e.stopPropagation()}>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.docx"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <label
        htmlFor={inputId}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
          background: 'rgba(245,240,232,0.03)',
          border: '1px dashed rgba(245,240,232,0.18)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: '11px',
          color: uploading ? 'rgba(245,240,232,0.35)' : 'rgba(245,240,232,0.6)',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ fontSize: '14px' }}>{uploading ? '…' : '↑'}</span>
        <span>{uploading ? `Uploading ${doc.label}…` : `Upload ${doc.label}`}</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(245,240,232,0.65)' }}>PDF or DOCX</span>
      </label>
    </div>
  );
}
