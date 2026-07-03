"use client";
import Link from "next/link";
import { GOLD, CREAM, CARD_BG, BORDER, INNER, GREEN } from "@/components/casefile/tokens";

interface Tile {
  label: string;
  description: string;
  href: string;
  accent?: boolean;
}

interface Category {
  key: string;
  label: string;
  tiles: Tile[];
}

interface ControlPanelProps {
  applicationId: string | null;
  isFranchise: boolean;
  isPartnership: boolean;
  marketAnalysisHref: string;
}

const eyebrow: React.CSSProperties = {
  fontSize: "8px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(201,168,76,0.4)",
  fontFamily: "'DM Sans', sans-serif",
};

const categoryLabel: React.CSSProperties = {
  fontSize: "9px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(201,168,76,0.5)",
  fontFamily: "'DM Sans', sans-serif",
  marginBottom: "8px",
};

function TileChip({ tile }: { tile: Tile }) {
  return (
    <Link
      href={tile.href}
      style={{
        display: "block",
        minWidth: "130px",
        maxWidth: "220px",
        flex: "1 1 160px",
        padding: "10px 14px",
        background: INNER,
        border: `1px solid ${BORDER}`,
        borderLeft: tile.accent ? `2px solid ${GREEN}` : `1px solid ${BORDER}`,
        textDecoration: "none",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BORDER;
        if (tile.accent) e.currentTarget.style.borderLeftColor = GREEN;
      }}
    >
      <div style={{
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
        color: CREAM,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        marginBottom: "2px",
      }}>
        {tile.label}
      </div>
      <div style={{
        fontSize: "10px",
        fontFamily: "'DM Sans', sans-serif",
        color: "rgba(245,240,232,0.4)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {tile.description}
      </div>
    </Link>
  );
}

function CategoryRow({ category }: { category: Category }) {
  if (category.tiles.length === 0) return null;
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={categoryLabel}>{category.label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {category.tiles.map((tile) => (
          <TileChip key={tile.href} tile={tile} />
        ))}
      </div>
    </div>
  );
}

export default function ControlPanel({ applicationId, isFranchise, isPartnership, marketAnalysisHref }: ControlPanelProps) {
  void isPartnership; // Partner 2 stays in its own dedicated section banner, not a panel tile

  const categories: Category[] = [
    {
      key: "case-file",
      label: "Case File",
      tiles: [
        { label: "Investor Profile", description: "Identity & background", href: "#investor" },
        { label: "Business Details",  description: "Entity & operations",  href: "#business" },
        { label: "Investment Snapshot", description: "Capital & source",  href: "#investment" },
        { label: "Family & Dependents", description: "Spouse & children", href: "/apply/family" },
        { label: "Security & Background", description: "DS-160 sworn statement", href: "/apply/security/principal" },
      ],
    },
    {
      key: "intelligence",
      label: "Case Intelligence",
      tiles: [
        { label: "Gap Analysis",    description: "Denial risk review",      href: "/gap-analysis" },
        { label: "Market Analysis", description: "Territory & competition", href: marketAnalysisHref },
        ...(isFranchise ? [
          { label: "FDD Review",           description: "Franchise disclosure",   href: "/fdd" },
          { label: "Franchise Navigator",  description: "Browse & match brands",  href: "/franchise" },
        ] : []),
      ],
    },
    {
      key: "interview",
      label: "Interview Prep",
      tiles: [
        { label: "Interview Simulator", description: "Practice sessions", href: "/simulator" },
        { label: "Prep Kit",            description: "Pre-interview materials", href: "/simulator/prep-kit" },
      ],
    },
    ...(applicationId ? [{
      key: "documents",
      label: "Documents",
      tiles: [
        { label: "Document Vault",    description: "Case documents", href: `/documents/${applicationId}` },
        { label: "Generate Package",  description: "Cover letter, business plan", href: `/generate/${applicationId}` },
      ],
    }] : []),
    {
      key: "tools",
      label: "Tools & Learn",
      tiles: [
        { label: "Checklist", description: "Pre-application prep", href: "/apply/checklist", accent: true },
        { label: "Calendar",  description: "Timeline & interview date", href: "/apply/calendar", accent: true },
        { label: "Knowledge Hub", description: "Guides & articles", href: "/learn" },
      ],
    },
  ];

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, padding: "20px 24px" }}>
      <div style={{ ...eyebrow, marginBottom: "16px" }}>Quick Access</div>
      {categories.map((category) => (
        <CategoryRow key={category.key} category={category} />
      ))}
    </div>
  );
}
