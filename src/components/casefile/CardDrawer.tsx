'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { GOLD, CREAM, GREEN, CARD_BG, BORDER } from '@/components/casefile/tokens';
import { CARD_DEFINITIONS, CARD_CATEGORY_LABELS, type CardId } from '@/lib/field-registry';
import type { CardDetailResponse, CardFieldDetail, PersonSummary } from '@/app/api/case/completion/route';
import type { DocTypeValue } from '@/components/apply/DocumentImportHub';

interface CardDrawerProps {
  cardId: CardId | null;
  applicationId: string | null;
  people: PersonSummary[];
  onClose: () => void;
  onUploadRequested: (docType?: DocTypeValue) => void;
  onAnswerSaved: () => void;
}

function sourceLabel(field: CardFieldDetail): string {
  if (field.source === 'manual') return 'Entered manually';
  if (field.source === 'quiz-overlay') return 'Estimated from your quiz';
  if (field.source === 'quiz_confirmed') return 'Confirmed from your quiz';
  if (field.source?.startsWith('document:')) {
    const docType = field.source.slice('document:'.length);
    return `From document: ${docType}`;
  }
  return '';
}

export default function CardDrawer({ cardId, applicationId, people, onClose, onUploadRequested, onAnswerSaved }: CardDrawerProps) {
  const [personId, setPersonId] = useState<string>('principal');
  const [fields, setFields] = useState<CardFieldDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    setPersonId('principal');
  }, [cardId]);

  const refetch = useCallback(() => {
    if (!cardId || !applicationId) return;
    setLoading(true);
    const params = new URLSearchParams({ applicationId, card: cardId, personId });
    fetch(`/api/case/completion?${params.toString()}`)
      .then((r) => r.json())
      .then((d: CardDetailResponse) => setFields(d.fields ?? []))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, [cardId, applicationId, personId]);

  useEffect(() => {
    if (!cardId) return;
    refetch();
  }, [cardId, refetch]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (cardId) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [cardId, onClose]);

  if (!cardId) return null;

  const def = CARD_DEFINITIONS[cardId];
  const showPersonTabs = cardId === 'security_background' && people.length > 1;

  async function handleConfirm(field: CardFieldDetail) {
    if (!applicationId || field.value === null) return;
    setSavingKey(field.key);
    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          question_key: field.key,
          answer_value: field.value,
          family_member_id: personId === 'principal' ? null : personId,
          source_document_type: 'quiz_confirmed',
        }),
      });
      refetch();
      onAnswerSaved();
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}
      />
      <div
        style={{
          position: 'relative',
          width: 'min(420px, 100vw)',
          height: '100%',
          background: CARD_BG,
          borderLeft: `1px solid ${BORDER}`,
          padding: '28px 24px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '6px' }}>
              {CARD_CATEGORY_LABELS[def.category]}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: CREAM }}>
              {def.label}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.5)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {showPersonTabs && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersonId(p.id)}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontFamily: "'DM Sans', sans-serif",
                  background: personId === p.id ? 'rgba(201,168,76,0.15)' : 'transparent',
                  border: `1px solid ${personId === p.id ? GOLD : BORDER}`,
                  color: personId === p.id ? CREAM : 'rgba(245,240,232,0.55)',
                  cursor: 'pointer',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ fontSize: '12px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.4)' }}>
            Loading…
          </div>
        )}

        {!loading && fields.length === 0 && (
          <div style={{ fontSize: '12px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.4)' }}>
            No fields tracked for this card yet.
          </div>
        )}

        {!loading && fields.map((field) => (
          <div
            key={field.key}
            style={{
              padding: '14px 0',
              borderBottom: `1px solid ${BORDER}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 600 }}>
              {field.label}
            </div>

            {field.status === 'filled' && (
              <>
                <div style={{ fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.85)' }}>
                  {field.value}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.4)' }}>
                    {sourceLabel(field)}
                  </span>
                  {field.source === 'quiz-overlay' && (
                    <button
                      type="button"
                      onClick={() => handleConfirm(field)}
                      disabled={savingKey === field.key}
                      style={{
                        fontSize: '10px',
                        fontFamily: "'DM Sans', sans-serif",
                        color: GREEN,
                        background: 'none',
                        border: `1px solid ${GREEN}`,
                        padding: '3px 10px',
                        cursor: savingKey === field.key ? 'default' : 'pointer',
                        opacity: savingKey === field.key ? 0.5 : 1,
                      }}
                    >
                      {savingKey === field.key ? 'Confirming…' : 'Confirm'}
                    </button>
                  )}
                  <Link
                    href={field.href}
                    style={{ fontSize: '10px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(201,168,76,0.7)' }}
                  >
                    Edit
                  </Link>
                </div>
              </>
            )}

            {field.status === 'suggested' && (
              <>
                <div style={{ fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.85)' }}>
                  {field.value}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontFamily: "'DM Sans', sans-serif", color: GOLD }}>
                    Document suggests this value — review and confirm
                  </span>
                  <Link
                    href={field.href}
                    style={{ fontSize: '10px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(201,168,76,0.7)' }}
                  >
                    Review
                  </Link>
                </div>
              </>
            )}

            {field.status === 'needed' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <Link
                  href={field.href}
                  style={{ fontSize: '11px', fontFamily: "'DM Sans', sans-serif", color: GOLD, fontWeight: 600 }}
                >
                  Answer
                </Link>
                <button
                  type="button"
                  onClick={() => onUploadRequested()}
                  style={{
                    fontSize: '11px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: 'rgba(245,240,232,0.55)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Upload a document instead
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
