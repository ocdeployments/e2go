"use client";

interface JourneyStage {
  id: string;
  label: string;
  short: string;
  done: boolean;
  isCurrent: boolean;
}

interface JourneySpineProps {
  stages: JourneyStage[];
}

export default function JourneySpine({ stages }: JourneySpineProps) {
  return (
    <div
      style={{
        padding: "18px 20px",
        background: "rgba(201,168,76,0.02)",
        border: "1px solid rgba(201,168,76,0.10)",
        marginBottom: "24px",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(201,168,76,0.45)",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          marginBottom: "14px",
        }}
      >
        Your Journey
      </div>
      <div style={{ display: "flex", alignItems: "center", minWidth: "380px" }}>
        {stages.map((stage, i) => (
          <div
            key={stage.id}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < stages.length - 1 ? 1 : 0,
              opacity: !stage.done && !stage.isCurrent ? 0.4 : 1,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              {/* Node */}
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  border: `1.5px solid ${
                    stage.done
                      ? "#C9A84C"
                      : stage.isCurrent
                      ? "rgba(201,168,76,0.6)"
                      : "rgba(245,240,232,0.15)"
                  }`,
                  background: stage.done ? "#C9A84C" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  outline: stage.isCurrent
                    ? "2px solid rgba(201,168,76,0.25)"
                    : "none",
                  outlineOffset: "2px",
                }}
              >
                {stage.done ? (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#0a0a0a",
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "8px",
                      color: stage.isCurrent
                        ? "rgba(201,168,76,0.8)"
                        : "rgba(245,240,232,0.25)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {stage.short}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: stage.done
                    ? "#C9A84C"
                    : stage.isCurrent
                    ? "rgba(245,240,232,0.85)"
                    : "rgba(245,240,232,0.25)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: stage.isCurrent ? 600 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: stage.done
                    ? "rgba(201,168,76,0.4)"
                    : "rgba(245,240,232,0.08)",
                  margin: "0 8px",
                  marginBottom: "18px",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
