"use client";

import { useState } from "react";
import Link from "next/link";

interface SectionCard {
  number: string;
  title: string;
  description: string;
  hoverDescription: string;
  href: string;
}

const SECTION_CARDS: SectionCard[] = [
  {
    number: "01",
    title: "Your Story",
    description: "Cover letter narrative and personal background",
    hoverDescription:
      "Your background, why you're investing in the US, and what makes you the right candidate.",
    href: "/apply/story",
  },
  {
    number: "02",
    title: "Your Business",
    description: "Business plan and entity details",
    hoverDescription:
      "A complete business plan formatted for E-2 visa consulate review.",
    href: "/apply/business",
  },
  {
    number: "03",
    title: "Your Investment",
    description: "Source of funds and investment proof",
    hoverDescription:
      "Documentation of your investment source and amount.",
    href: "/apply/investment",
  },
  {
    number: "04",
    title: "Your Qualifications",
    description: "Experience, education, and credentials",
    hoverDescription:
      "Your professional credentials and relevant experience.",
    href: "/apply/qualifications",
  },
  {
    number: "05",
    title: "Your Family",
    description: "Dependents and family documentation",
    hoverDescription:
      "Spouse and dependent children included in the application.",
    href: "/apply/family",
  },
  {
    number: "06",
    title: "Your Ties",
    description: "Home country ties and non-marginality",
    hoverDescription:
      "Evidence of ties to your home country.",
    href: "/apply/ties",
  },
];

const LOCK_SVG = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    style={{ flexShrink: 0 }}
    aria-hidden="true"
  >
    <rect
      x="2.5"
      y="6"
      width="9"
      height="7"
      rx="0"
      stroke="rgba(245,240,232,0.35)"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M4.5 6V4.2a2.5 2.5 0 0 1 5 0V6"
      stroke="rgba(245,240,232,0.35)"
      strokeWidth="1.2"
      fill="none"
    />
  </svg>
);

interface LockedCardProps {
  card: SectionCard;
}

function LockedCard({ card }: LockedCardProps) {
  const [hovered, setHovered] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const handleTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next === 1) {
      setHovered(true);
    }
    // Second tap navigates — handled by the Link wrapper below
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTapCount(0); }}
      onClick={handleTap}
      style={{
        position: "relative",
        padding: "18px 20px",
        background: "rgba(201,168,76,0.01)",
        border: `1px solid ${hovered ? "rgba(201,168,76,0.45)" : "rgba(201,168,76,0.10)"}`,
        transition: "border-color 0.2s ease",
        cursor: "default",
        opacity: 0.85,
      }}
    >
      {/* Lock icon — top right */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {LOCK_SVG}
      </div>

      {/* Section number */}
      <div
        style={{
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(201,168,76,0.35)",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          marginBottom: "6px",
        }}
      >
        Section {card.number}
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 300,
          fontSize: "16px",
          color: "rgba(245,240,232,0.55)",
          marginBottom: "4px",
        }}
      >
        {card.title}
      </div>

      {/* Base description (always visible) */}
      <div
        style={{
          fontSize: "11px",
          color: "rgba(245,240,232,0.3)",
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1.5,
          marginBottom: hovered ? "10px" : "0",
        }}
      >
        {card.description}
      </div>

      {/* Hover description — slides in */}
      {hovered && (
        <div
          style={{
            fontSize: "11px",
            color: "rgba(245,240,232,0.62)",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.6,
            marginBottom: "12px",
          }}
        >
          {card.hoverDescription}
        </div>
      )}

      {/* Footer CTA */}
      <div
        style={{
          borderTop: "1px solid rgba(201,168,76,0.08)",
          paddingTop: "10px",
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {tapCount >= 1 ? (
          <Link
            href="/pricing"
            style={{
              fontSize: "11px",
              color: "#C9A84C",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            Unlock with Complete — $1,495 →
          </Link>
        ) : (
          <Link
            href="/pricing"
            style={{
              fontSize: "11px",
              color: "rgba(201,168,76,0.55)",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            Unlock with Complete — $1,495 →
          </Link>
        )}
      </div>
    </div>
  );
}

interface UnlockedCardProps {
  card: SectionCard;
}

function UnlockedCard({ card }: UnlockedCardProps) {
  return (
    <Link
      href={card.href}
      style={{
        display: "block",
        padding: "18px 20px",
        background: "rgba(201,168,76,0.02)",
        border: "1px solid rgba(201,168,76,0.15)",
        textDecoration: "none",
        transition: "border-color 0.15s ease",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(201,168,76,0.5)",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          marginBottom: "6px",
        }}
      >
        Section {card.number}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 300,
          fontSize: "16px",
          color: "#f5f0e8",
          marginBottom: "4px",
        }}
      >
        {card.title}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "rgba(245,240,232,0.5)",
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1.5,
        }}
      >
        {card.description}
      </div>
      <div
        style={{
          borderTop: "1px solid rgba(201,168,76,0.08)",
          paddingTop: "10px",
          marginTop: "10px",
          fontSize: "11px",
          color: "#C9A84C",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.04em",
        }}
      >
        Open section →
      </div>
    </Link>
  );
}

interface LockedSectionCardsProps {
  hasComplete: boolean;
}

export default function LockedSectionCards({ hasComplete }: LockedSectionCardsProps) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "14px" }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontSize: "18px",
            color: "#f5f0e8",
            margin: 0,
          }}
        >
          Application Sections
        </h2>
        {!hasComplete && (
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(201,168,76,0.5)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Locked — unlock with Complete
          </span>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "12px",
        }}
      >
        {SECTION_CARDS.map((card) =>
          hasComplete ? (
            <UnlockedCard key={card.number} card={card} />
          ) : (
            <LockedCard key={card.number} card={card} />
          )
        )}
      </div>
    </section>
  );
}
