"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

interface ResultData {
  outcome: string;
  score: number;
  warnings: string[];
  attorney_flags: string[];
  franchise_interest: boolean;
  answers: Record<string, string | string[]>;
  country: string;
  investment_range: string;
  application_type: string;
  dependents: string;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent eligibility profile";
  if (score >= 80) return "Strong eligibility profile";
  if (score >= 70) return "Good eligibility profile — some areas to address";
  if (score >= 60) return "Moderate profile — attention required";
  return "Elevated risk profile — legal guidance recommended";
}

function getVerdict(outcome: string, score: number): string {
  if (outcome === "PROCEED" && score >= 90) return "You are strongly positioned for the E-2 Treaty Investor visa.";
  if (outcome === "PROCEED" || outcome === "PROCEED_RISK") return "You appear to qualify for the E-2 Treaty Investor visa.";
  if (outcome === "ATTORNEY_RECOMMENDED") return "You may qualify — with legal guidance recommended for your situation.";
  return "Your eligibility requires further review.";
}

function getVerdictSub(outcome: string, warnings: string[]): string {
  if (outcome === "PROCEED") return "Your profile clears all core eligibility requirements with no material risk flags.";
  if (outcome === "PROCEED_RISK") {
    const count = warnings.length;
    return `Your profile clears all core requirements. ${count} area${count > 1 ? "s" : ""} flagged below will need attention in your application — ${count > 1 ? "both are" : "this is"} manageable with the right preparation.`;
  }
  if (outcome === "ATTORNEY_RECOMMENDED") return "Your profile has complexity that benefits from legal review. You can still proceed — we recommend consulting an attorney alongside your preparation.";
  return "Based on your answers, we recommend speaking with a qualified immigration attorney before proceeding.";
}

function getPricingFromAnswers(data: ResultData): { tier: string; base: number; spouseAdd: number; childrenAdd: number; total: number } {
  const isPartnership = data.application_type === "partnership";
  const dep = data.dependents || "";
  const hasSpouse = dep.toLowerCase().includes("spouse") || dep.toLowerCase().includes("partner");
  const hasChildren = dep.toLowerCase().includes("children") || dep.toLowerCase().includes("child");

  const base = isPartnership ? 447 : 247;
  let spouseAdd = 0;
  let childrenAdd = 0;

  if (hasSpouse && !isPartnership) spouseAdd = 47;
  if (hasChildren) childrenAdd = 27;

  if (isPartnership && hasSpouse) spouseAdd = 100;

  const total = base + spouseAdd + childrenAdd;
  const tier = isPartnership ? "Partnership Application" : "Solo Application — Standard";

  return { tier, base, spouseAdd, childrenAdd, total };
}

function getTimelineWeeks(data: ResultData): string {
  const hasBusiness = (data.answers["Q0-08"] as string || "").includes("specific business");
  if (hasBusiness) return "10 – 14 weeks";
  return "16 – 22 weeks";
}

function getConsulateIntel(country: string): { name: string; intel: string } {
  const map: Record<string, { name: string; intel: string }> = {
    "Canada": {
      name: "Toronto Consulate",
      intel: "Currently processing E-2 applications in 8–12 weeks from submission to interview. Service-based franchises and established brands have the highest approval rates in recent adjudications."
    },
    "United Kingdom": {
      name: "London Embassy",
      intel: "Processing times are currently 10–14 weeks. UK applicants benefit from strong treaty standing. Business plans with detailed job creation projections perform well."
    },
    "Germany": {
      name: "Frankfurt Consulate",
      intel: "Processing times average 8–12 weeks. German applicants have strong treaty standing. Investment documentation standards are thorough — source of funds narratives must be precise."
    },
    "Australia": {
      name: "Sydney Consulate",
      intel: "Processing times average 10–16 weeks. Australian applicants have strong treaty standing. Franchise applications with established U.S. brands perform consistently well."
    },
    "Japan": {
      name: "Tokyo Embassy",
      intel: "Processing times average 8–14 weeks. Japanese applicants benefit from a long-standing treaty relationship with the U.S. Investment documentation requirements are thorough."
    },
  };
  return map[country] || {
    name: "Your Home Consulate",
    intel: "Processing times vary by consulate. We track approval patterns across all 82 treaty countries. Your specific consulate intelligence will be surfaced during your application preparation."
  };
}

export default function ResultsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      const stored = localStorage.getItem("e2go_quiz_result");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setData(parsed);
          setLoading(false);
          return;
        } catch {}
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: session } = await supabase
            .from("quiz_sessions")
            .select("result_json, outcome, score")
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false })
            .limit(1)
            .single();
          if (session?.result_json) {
            setData(session.result_json as ResultData);
            setLoading(false);
            return;
          }
        }
      } catch {}

      router.push("/quiz");
    };
    loadResult();
  }, [supabase, router]);

  if (loading) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading your result...</div>
      </div>
    );
  }

  if (!data) return null;

  const score = data.score || 80;
  const outcome = data.outcome || "PROCEED";
  const pricing = getPricingFromAnswers(data);
  const timeline = getTimelineWeeks(data);
  const consulate = getConsulateIntel(data.country);
  const scoreLabel = getScoreLabel(score);
  const verdict = getVerdict(outcome, score);
  const verdictSub = getVerdictSub(outcome, data.warnings || []);

  const flagsToShow = (data.warnings || []).slice(0, 4);
  const clearItems = [
    !data.attorney_flags?.length && "No attorney-level risk flags",
    !(data.warnings || []).some(w => w.includes("refusal")) && "No immigration history issues",
    !(data.warnings || []).some(w => w.includes("documentation")) && "Investment source — clear",
  ].filter(Boolean) as string[];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>

      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Eligibility result</div>
      </div>

      <div style={{ padding: "56px 40px 40px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div style={{ maxWidth: "720px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: "0 0 24px", height: "1px", background: "rgba(201,168,76,0.4)" }} />
            Assessment complete
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "16px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "80px", fontWeight: 300, color: "#C9A84C", lineHeight: 1 }}>{score}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "rgba(201,168,76,0.4)", lineHeight: 1, paddingBottom: "10px" }}>/100</div>
            <div style={{ flex: 1, paddingBottom: "16px" }}>
              <div style={{ height: "3px", background: "rgba(201,168,76,0.12)", marginBottom: "8px" }}>
                <div style={{ height: "100%", background: "#C9A84C", width: `${score}%`, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
              </div>
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{scoreLabel}</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.25, marginBottom: "12px", letterSpacing: "-0.01em" }}>{verdict}</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.45)", lineHeight: 1.7, maxWidth: "560px" }}>{verdictSub}</div>
        </div>
      </div>

      <div style={{ padding: "40px", display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px", maxWidth: "1100px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Your profile</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Treaty country", value: data.country || "—", ok: !!data.country },
                { label: "Investment range", value: data.investment_range || "—", ok: true },
                { label: "Application type", value: data.application_type === "partnership" ? "Partnership — consular" : "Solo — consular processing", gold: true },
                { label: "Dependents", value: data.dependents || "Just me", neutral: true },
                { label: "Business status", value: (data.answers?.["Q0-08"] as string) || "—", neutral: true },
                { label: "Funds documentation", value: (data.warnings || []).some(w => w.includes("gap") || w.includes("docum")) ? "Needs attention" : "Clear", warn: (data.warnings || []).some(w => w.includes("gap") || w.includes("docum")) },
              ].map(cell => (
                <div key={cell.label} style={{ padding: "14px 16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.3)", marginBottom: "5px" }}>{cell.label}</div>
                  <div style={{ fontSize: "14px", color: cell.ok ? "#5DCAA5" : cell.gold ? "#C9A84C" : cell.warn ? "rgba(239,159,39,0.9)" : "#f5f0e8", lineHeight: 1.4 }}>
                    {cell.ok && "✓ "}{cell.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(flagsToShow.length > 0 || clearItems.length > 0) && (
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Areas requiring attention</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {flagsToShow.map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: "1px solid rgba(239,159,39,0.25)", background: "rgba(239,159,39,0.04)" }}>
                    <div style={{ fontSize: "16px", color: "rgba(239,159,39,0.8)", flexShrink: 0, marginTop: "1px" }}>!</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(239,159,39,0.95)", marginBottom: "3px" }}>Flagged area</div>
                      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>{w}</div>
                    </div>
                  </div>
                ))}
                {clearItems.slice(0, 2).map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: "1px solid rgba(93,202,165,0.2)", background: "rgba(93,202,165,0.03)" }}>
                    <div style={{ fontSize: "16px", color: "#5DCAA5", flexShrink: 0, marginTop: "1px" }}>✓</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#5DCAA5", marginBottom: "3px" }}>{item}</div>
                      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>No issues detected in this area of your profile.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Estimated path to your interview</div>
            <div style={{ padding: "16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)", marginBottom: "12px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#C9A84C", marginBottom: "4px" }}>{timeline}</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)" }}>Estimated from today to your consulate interview, based on your profile and current processing times.</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              {["Eligibility confirmed", "Business selection", "Application package", "DS-160 & booking", "Interview"].map((step, i) => (
                <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: i === 0 ? "rgba(93,202,165,0.6)" : i === 1 ? "#C9A84C" : "rgba(201,168,76,0.2)", border: `1px solid ${i === 0 ? "#5DCAA5" : i === 1 ? "#C9A84C" : "rgba(201,168,76,0.3)"}`, flexShrink: 0 }} />
                    {i < 4 && <div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.15)" }} />}
                  </div>
                  <div style={{ fontSize: "10px", color: i === 0 ? "rgba(93,202,165,0.7)" : i === 1 ? "#C9A84C" : "rgba(245,240,232,0.35)", textAlign: "center", letterSpacing: "0.04em", lineHeight: 1.4, maxWidth: "60px" }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Your next steps</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { title: "Create your account", desc: "Save this result. Begin your application. Takes 60 seconds." },
                { title: "Select your business", desc: data.franchise_interest ? "We can connect you with E-2 specialist franchise brokers in your investment range." : "Complete the business type advisor to confirm your business qualifies." },
                { title: "Complete the document interview", desc: "Our guided engine builds your complete application package — cover letter, source of funds, business plan, and all supporting documents." },
                { title: "Download your consulate package", desc: "A complete, consulate-formatted binder ready for your interview. Every tab, every document, in the correct order." },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#C9A84C", flexShrink: 0, fontWeight: 500 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#f5f0e8", marginBottom: "2px" }}>{step.title}</div>
                    <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Link href={`/pricing?tier=${data.application_type}&dependents=${encodeURIComponent(data.dependents || "none")}`}>
              <button style={{ width: "100%", padding: "15px 24px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                Start my application →
              </button>
            </Link>
            <button style={{ width: "100%", padding: "12px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, marginTop: "8px" }}>
              Email me this result
            </button>
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.04)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Your recommended package</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: "18px", color: "#f5f0e8", marginBottom: "14px" }}>{pricing.tier}</div>
            {[
              { label: pricing.tier.includes("Partnership") ? "Partnership base" : "Solo applicant", price: `$${pricing.base}` },
              pricing.spouseAdd > 0 && { label: "Add spouse", price: `+$${pricing.spouseAdd}` },
              pricing.childrenAdd > 0 && { label: "Add children", price: `+$${pricing.childrenAdd}` },
            ].filter(Boolean).map((row: { label: string; price: string } | false, i) => row && (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                <div style={{ fontSize: "13px", color: "#f5f0e8" }}>{row.label}</div>
                <div style={{ fontSize: "14px", color: "#C9A84C", fontWeight: 500 }}>{row.price}</div>
              </div>
            ))}
            <div style={{ height: "1px", background: "rgba(201,168,76,0.12)", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)" }}>Total</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", color: "#C9A84C", fontWeight: 300 }}>${pricing.total}</div>
            </div>
            <Link href={`/pricing?tier=${data.application_type}`}>
              <button style={{ width: "100%", padding: "12px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Start for ${pricing.total} →</button>
            </Link>
          </div>

          {data.franchise_interest && (
            <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Franchise broker network</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: "17px", color: "#f5f0e8", marginBottom: "8px" }}>We can connect you with the right broker</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "14px" }}>Based on your profile, we can connect you with E-2 specialist franchise brokers in your investment range. Introductions made only with your consent.</div>
              {["FranConnect Advisors — E-2 specialist", "Gateway Franchise Group — Service franchises"].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#C9A84C", flexShrink: 0 }}>B</div>
                  <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.55)" }}>{b}</div>
                </div>
              ))}
              <button style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "11px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, marginTop: "4px" }}>Request an introduction →</button>
            </div>
          )}

          <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Consulate intelligence</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
              <div style={{ fontSize: "18px", color: "rgba(201,168,76,0.6)", flexShrink: 0, marginTop: "1px" }}>⊞</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>
                <strong style={{ color: "rgba(245,240,232,0.8)", fontWeight: 500 }}>{consulate.name}</strong> — {consulate.intel}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.2)", marginTop: "6px" }}>Updated June 2026 · Applicant-reported data</div>
          </div>

          <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "8px" }}>Share this result</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.6, marginBottom: "12px" }}>Send your eligibility summary to a spouse, business partner, or immigration attorney.</div>
            <button style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "11px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Email this result</button>
          </div>

        </div>
      </div>

      <div style={{ padding: "20px 40px", borderTop: "1px solid rgba(201,168,76,0.06)" }}>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.18)", lineHeight: 1.6, maxWidth: "720px" }}>
          This assessment is based solely on the answers you provided and does not constitute legal advice. e2go.app is a self-service preparation tool, not a law firm. Consular decisions involve factors beyond the scope of any preparation tool. For legal advice, consult a qualified U.S. immigration attorney.
        </div>
      </div>

    </div>
  );
}
