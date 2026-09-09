'use client';

import { GOLD, CREAM, CARD_BG, BORDER, INNER } from '@/components/casefile/tokens';
import StatusChip from '@/components/casefile/StatusChip';
import {
  CARD_DEFINITIONS,
  CARD_CATEGORY_LABELS,
  getRequiredFieldsForCard,
  type CardId,
  type CardCategory,
} from '@/lib/field-registry';
import type { CaseCompletionResponse, CardCompletion, CardState } from '@/app/api/case/completion/route';

interface CardGridProps {
  completion: CaseCompletionResponse | null;
  onCardClick: (cardId: CardId) => void;
}

const CATEGORY_ORDER: CardCategory[] = ['case_file', 'case_intelligence', 'interview_prep', 'documents'];

const DEFAULT_ORDERING: CardId[] = (Object.values(CARD_DEFINITIONS) as { id: CardId; order: number }[])
  .sort((a, b) => a.order - b.order)
  .map((c) => c.id);

// Provenance note computed from the card's own completion numbers — never a
// hardcoded per-card string (the K-2 mandate: kill the 92 hardcoded notes).
function noteFor(cardId: CardId, card: CardCompletion | undefined): string {
  if (!card) return 'Not started';
  if (card.note) return card.note;
  switch (card.state) {
    case 'locked':
      return 'Locked';
    case 'not_started':
      return 'Not started';
    case 'in_progress': {
      const requiredTotal = getRequiredFieldsForCard(cardId).length;
      if (requiredTotal > 0) {
        const requiredHave = requiredTotal - card.needed;
        return `${requiredHave}/${requiredTotal} required`;
      }
      return `${card.have} answered`;
    }
    case 'ready':
      return 'All required fields complete';
    case 'generated':
      return 'Generated';
    default:
      return '';
  }
}

function CardTile({ cardId, card, onClick }: { cardId: CardId; card: CardCompletion | undefined; onClick: () => void }) {
  const def = CARD_DEFINITIONS[cardId];
  const state: CardState = card?.state ?? 'not_started';
  const locked = state === 'locked';

  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      disabled={locked}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '8px',
        minWidth: '160px',
        maxWidth: '220px',
        flex: '1 1 180px',
        padding: '14px 16px',
        background: INNER,
        border: `1px solid ${BORDER}`,
        textAlign: 'left',
        cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.5 : 1,
        font: 'inherit',
      }}
      onMouseEnter={(e) => { if (!locked) e.currentTarget.style.borderColor = GOLD; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; }}
    >
      <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: CREAM }}>
        {def.label}
      </div>
      <StatusChip state={state} />
      <div style={{ fontSize: '10px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.4)' }}>
        {noteFor(cardId, card)}
      </div>
    </button>
  );
}

function CategoryRow({
  category,
  ordering,
  cards,
  onCardClick,
}: {
  category: CardCategory;
  ordering: CardId[];
  cards: Partial<Record<CardId, CardCompletion>>;
  onCardClick: (id: CardId) => void;
}) {
  const cardIds = ordering.filter((id) => CARD_DEFINITIONS[id].category === category);
  if (cardIds.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '9px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(201,168,76,0.5)',
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: '10px',
      }}>
        {CARD_CATEGORY_LABELS[category]}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {cardIds.map((id) => (
          <CardTile key={id} cardId={id} card={cards[id]} onClick={() => onCardClick(id)} />
        ))}
      </div>
    </div>
  );
}

export default function CardGrid({ completion, onCardClick }: CardGridProps) {
  const ordering = completion?.ordering ?? DEFAULT_ORDERING;
  const cards = completion?.cards ?? {};

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, padding: '20px 24px' }}>
      <div style={{
        fontSize: '9px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'rgba(201,168,76,0.4)',
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: '16px',
      }}>
        Your Case
      </div>
      {CATEGORY_ORDER.map((category) => (
        <CategoryRow key={category} category={category} ordering={ordering} cards={cards} onCardClick={onCardClick} />
      ))}
    </div>
  );
}
