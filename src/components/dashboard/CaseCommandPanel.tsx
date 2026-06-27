"use client";
import type { CSSProperties } from "react";

interface CaseCommandPanelProps {
  score: number;
  currentPhase: string;
  nextAction: string;
  nextActionWhy?: string;
}

export default function CaseCommandPanel({
  score,
  currentPhase,
  nextAction,
  nextActionWhy,
}: CaseCommandPanelProps) {
  const eyebrow: CSSProperties = {
    fontSize: "9px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(245,240,232,0.38)",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    marginBottom: "4px",
  };

  return (
    <div
      style={{
        background: "#1C1408",
        border: "1px solid rgba(201,168,76,0.15)",
        padding: "22px 24px 24px",
        height: "100%",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "20px",
            fontWeight: 300,
            color: "#f5f0e8",
          }}
        >
          Case Command Panel
        </div>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(201,168,76,0.7)",
            border: "1px solid rgba(201,168,76,0.3)",
            padding: "4px 10px",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          E-2 Application
        </div>
      </div>

      {/* Score + Phase row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        {/* Left: readiness score */}
        <div>
          <div
            style={{
              fontSize: "22px",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              color: "#f5f0e8",
              marginBottom: "8px",
              lineHeight: 1,
            }}
          >
            {score}%
          </div>
          <div
            style={{
              height: "2px",
              background: "rgba(201,168,76,0.12)",
              width: "100%",
              maxWidth: "180px",
              marginBottom: "8px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${score}%`,
                background: "#C9A84C",
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              border: "1px solid rgba(201,168,76,0.2)",
              background: "rgba(201,168,76,0.04)",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "rgba(201,168,76,0.6)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(201,168,76,0.65)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Readiness Score
            </span>
          </div>
        </div>

        {/* Right: current phase + next action */}
        <div>
          <div style={eyebrow}>Current Phase</div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "17px",
              fontWeight: 300,
              color: "#f5f0e8",
              marginBottom: "14px",
              lineHeight: 1.2,
            }}
          >
            {currentPhase}
          </div>
          <div style={eyebrow}>Next Required Action</div>
          <div
            style={{
              fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif",
              color: "rgba(245,240,232,0.88)",
              lineHeight: 1.3,
              fontWeight: 500,
              marginBottom: nextActionWhy ? "6px" : 0,
            }}
          >
            {nextAction}
          </div>
          {nextActionWhy && (
            <div
              style={{
                fontSize: "10px",
                fontFamily: "'DM Sans', sans-serif",
                color: "rgba(245,240,232,0.42)",
                lineHeight: 1.5,
              }}
            >
              {nextActionWhy}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
