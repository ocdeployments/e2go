"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import quizData from "@/data/module0_questions.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Answer = string | string[];

interface QuizOption {
  text: string;
  action?: string;
  code?: string | null;
  warning_message?: string | null;
}

interface QuizQuestion {
  id: string;
  type: string;
  section: string;
  section_index: number;
  question: string;
  helper_text: string;
  tooltip: string;
  is_sub: boolean;
  parent: string | null;
  show_if: Record<string, string[]> | null;
  options: QuizOption[];
}

interface HardStops {
  [code: string]: string;
}

interface ScoreWeights {
  base_score: number;
  deductions: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const TREATY_COUNTRIES = [
  "Albania","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahrain","Bangladesh","Belgium","Bolivia","Bosnia and Herzegovina",
  "Bulgaria","Cameroon","Canada","Chile","Colombia","Congo",
  "Costa Rica","Croatia","Czech Republic","Denmark","Ecuador",
  "Egypt","Estonia","Ethiopia","Finland","France","Georgia",
  "Germany","Greece","Grenada","Honduras","Ireland","Israel",
  "Italy","Japan","Jordan","Kazakhstan","South Korea","Kosovo",
  "Kyrgyzstan","Latvia","Liberia","Lithuania","Luxembourg",
  "Macedonia","Mexico","Moldova","Mongolia","Montenegro","Morocco",
  "Netherlands","New Zealand","Norway","Oman","Pakistan","Panama",
  "Paraguay","Philippines","Poland","Romania","Senegal","Serbia",
  "Singapore","Slovak Republic","Slovenia","Spain","Sri Lanka",
  "Suriname","Sweden","Switzerland","Thailand","Togo",
  "Trinidad and Tobago","Tunisia","Turkey","Ukraine",
  "United Kingdom","Yugoslavia"
];

const ALL_QUESTIONS = quizData.questions as QuizQuestion[];
const HARD_STOPS = quizData.hard_stops as HardStops;
const SCORE_WEIGHTS = quizData.score_weights as ScoreWeights;
const SECTIONS = quizData.sections as string[];

// ---------------------------------------------------------------------------
// Show-if evaluator
// ---------------------------------------------------------------------------

function evaluateShowIf(
  showIf: Record<string, string[]> | null,
  answers: Record<string, Answer>
): boolean {
  if (!showIf) return true;

  // Handle _or_parent_sub: show if parent's sub-question was answered
  // (meaning this question's parent directed to a sub that was answered)
  if ("_or_parent_sub" in showIf) {
    const parentSubConditions = showIf["_or_parent_sub"] as unknown as Record<string, string[]>;
    let parentSubMet = false;
    for (const [qId, allowedValues] of Object.entries(parentSubConditions)) {
      const ans = answers[qId];
      if (typeof ans === "string" && allowedValues.includes(ans)) {
        parentSubMet = true;
        break;
      }
    }
    if (!parentSubMet) return false;
  }

  // Handle _and_not_sub: show only if the specified sub-question was NOT answered
  if ("_and_not_sub" in showIf) {
    const notSubId = showIf["_and_not_sub"] as unknown as string;
    if (answers[notSubId] !== undefined) return false;
  }

  // Standard show_if: each key must match at least one of its allowed values
  for (const [qId, allowedValues] of Object.entries(showIf)) {
    if (qId.startsWith("_")) continue; // skip meta keys
    const ans = answers[qId];
    if (typeof ans === "string") {
      if (!allowedValues.includes(ans)) return false;
    } else if (Array.isArray(ans)) {
      // Multiselect: show if any selected value is in the allowed list
      const hasMatch = ans.some((v: string) => allowedValues.includes(v));
      if (!hasMatch) return false;
    } else {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Score calculator
// ---------------------------------------------------------------------------

function calculateScore(warningCodes: string[]): number {
  let score = SCORE_WEIGHTS.base_score;
  for (const code of warningCodes) {
    const deduction = SCORE_WEIGHTS.deductions[code];
    if (deduction) score -= deduction;
  }
  return Math.max(score, 0);
}

function getOutcome(
  hardStopsTriggered: string[],
  attorneyFlags: string[],
  warningCodes: string[]
): string {
  if (hardStopsTriggered.length > 0) return "DO_NOT_PROCEED";
  if (attorneyFlags.length > 0) return "ATTORNEY_RECOMMENDED";
  if (warningCodes.length > 0) return "PROCEED_RISK";
  return "PROCEED";
}

// ---------------------------------------------------------------------------
// Extract warning code from action string
// ---------------------------------------------------------------------------

function extractWarningCode(action: string): string | null {
  const match = action.match(/^warn:(.+)$/);
  return match ? match[1] : null;
}

function extractAttorneyCode(action: string): string | null {
  const match = action.match(/^attorney:(.+)$/);
  return match ? match[1] : null;
}

function extractStopCode(action: string): string | null {
  const match = action.match(/^stop:(.+)$/);
  return match ? match[1] : null;
}

function extractSubTarget(action: string): string | null {
  const match = action.match(/^sub:(.+)$/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(true);
  const authCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [warningCodes, setWarningCodes] = useState<string[]>([]);
  const [attorneyFlags, setAttorneyFlags] = useState<string[]>([]);
  const [franchiseInterest, setFranchiseInterest] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [multiSel, setMultiSel] = useState<number[]>([]);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [caslConsent, setCaslConsent] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [returnToResults, setReturnToResults] = useState(false);
  const [hardStopsTriggered, setHardStopsTriggered] = useState<string[]>([]);

  // Compute visible questions from JSON + current answers
  const visibleQuestions = useMemo(() => {
    return ALL_QUESTIONS.filter(q => evaluateShowIf(q.show_if, answers));
  }, [answers]);

  const q = visibleQuestions[cur] || null;

  // Options for current question
  const displayOpts = useMemo(() => {
    if (!q) return [];
    return q.options;
  }, [q]);

  // Auth check + draft restore
  useEffect(() => {
    authCheckTimeout.current = setTimeout(() => {
      setAuthChecked(true);
    }, 1000);

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (authCheckTimeout.current) clearTimeout(authCheckTimeout.current);
        if (user) {
          setLoggedInUser({ id: user.id, email: user.email || "" });
          const { data: existing } = await supabase
            .from("quiz_sessions")
            .select("id, outcome")
            .eq("user_id", user.id)
            .not("outcome", "is", null)
            .order("completed_at", { ascending: false })
            .limit(1)
            .single();
          if (existing) {
            router.push("/dashboard");
            return;
          }
        }
      } catch {
        // ignore
      } finally {
        setAuthChecked(true);
        const draft = localStorage.getItem("e2go_quiz_draft");
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            const savedAt = new Date(parsed.savedAt);
            const daysSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 7 && parsed.answers && Object.keys(parsed.answers).length > 0) {
              setAnswers(parsed.answers);
              setCur(parsed.cur || 0);
              setWarningCodes(parsed.warningCodes || []);
              setAttorneyFlags(parsed.attorneyFlags || []);
              setFranchiseInterest(parsed.franchiseInterest || false);
              setHardStopsTriggered(parsed.hardStopsTriggered || []);
            }
          } catch {
            localStorage.removeItem("e2go_quiz_draft");
          }
        }
        const jumpTo = localStorage.getItem("quiz_jump_to");
        if (jumpTo !== null) {
          const idx = parseInt(jumpTo, 10);
          if (!isNaN(idx)) {
            setCur(idx);
            setReturnToResults(true);
          }
          localStorage.removeItem("quiz_jump_to");
        }
      }
    };
    checkAuth();
    return () => {
      if (authCheckTimeout.current) clearTimeout(authCheckTimeout.current);
    };
  }, [supabase, router]);

  // Scroll highlighted country into view
  useEffect(() => {
    if (highlightedIdx >= 0) {
      const el = document.getElementById(`country-option-${highlightedIdx}`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIdx]);

  // Save draft helper
  const saveDraft = useCallback(
    (newAnswers: Record<string, Answer>, newCur: number, newWarnings: string[], newAttorney: string[], newFranchise: boolean) => {
      localStorage.setItem(
        "e2go_quiz_draft",
        JSON.stringify({
          answers: newAnswers,
          cur: newCur,
          warningCodes: newWarnings,
          attorneyFlags: newAttorney,
          franchiseInterest: newFranchise,
          savedAt: new Date().toISOString(),
        })
      );
    },
    []
  );

  // Advance to next question
  const advance = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setCur((prev) => {
        const next = prev + 1;
        if (next >= visibleQuestions.length) return prev;
        return next;
      });
      setSelectedIdx(null);
      setWarnMsg(null);
      setMultiSel([]);
    }, 200);
  }, [visibleQuestions.length]);

  // Handle completion
  const handleComplete = useCallback(
    async (
      finalAnswers: Record<string, Answer>,
      finalWarningCodes: string[],
      finalAttorneyFlags: string[],
      finalFranchise: boolean,
      finalHardStops: string[]
    ) => {
      const score = calculateScore(finalWarningCodes);
      const outcome = getOutcome(finalHardStops, finalAttorneyFlags, finalWarningCodes);

      const resultData = {
        outcome,
        score,
        warnings: finalWarningCodes,
        attorney_flags: finalAttorneyFlags,
        franchise_interest: finalFranchise,
        answers: finalAnswers,
        country: (finalAnswers["Q0-01"] as string) || "",
        cos_flag: (() => {
          const q5 = (finalAnswers["Q0-05"] as string || "").toLowerCase();
          return q5.includes("valid status") || q5.includes("change of status");
        })(),
        investment_range: (finalAnswers["Q0-07"] as string) || "",
        application_type: (() => {
          // Q0-02 takes priority — it establishes the structure first
          const q2 = (finalAnswers["Q0-02"] as string || "").toLowerCase();
          if (q2.includes("co-invest")) return "spousal_partnership";
          if (q2.includes("business partner")) return "partnership";
          if (q2.includes("spouse will accompany")) return "solo";

          // Q0-04 for cases where Q0-02 = sole applicant
          const q4 = (finalAnswers["Q0-04"] as string || "").toLowerCase();
          if (q4.includes("50%") || q4.includes("50/50")) return "partnership";

          return "solo";
        })(),
        partner_type: (() => {
          const q2 = (finalAnswers["Q0-02"] as string || "").toLowerCase();
          if (q2.includes("co-invest")) return "spouse";
          if (q2.includes("business partner")) return "unrelated";

          const q4 = (finalAnswers["Q0-04"] as string || "").toLowerCase();
          if (q4.includes("50%") || q4.includes("50/50")) return "unrelated";

          return "none";
        })(),
        dependents: (() => {
          // Check Q0-02 established spouse first
          const q2 = (finalAnswers["Q0-02"] as string || "").toLowerCase();
          if (q2.includes("spouse will accompany") || q2.includes("co-invest")) {
            // Check Q0-02a or Q0-03 for children
            const q2a = (finalAnswers["Q0-02a"] as string || "").toLowerCase();
            if (q2a.includes("children") && !q2a.includes("no children")) return "spouse_and_children";
            return "spouse_only";
          }

          // Q0-03 determines dependents for solo/partner paths
          const a = (finalAnswers["Q0-03"] as string || "").toLowerCase();
          if (a.includes("spouse and children")) return "spouse_and_children";
          if (a.includes("children only")) return "children_only";
          if (a.includes("spouse")) return "spouse_only";
          return "just_me";
        })(),
        hard_stops_triggered: finalHardStops,
      };

      localStorage.setItem("e2go_quiz_result", JSON.stringify(resultData));
      localStorage.removeItem("e2go_quiz_draft");

      if (returnToResults) {
        router.push("/results?from=quiz");
        return;
      }

      if (loggedInUser) {
        setIsSaving(true);
        try {
          await supabase.from("quiz_sessions").insert({
            user_id: loggedInUser.id,
            email: loggedInUser.email,
            outcome,
            score,
            hard_stop_codes: finalHardStops,
            attorney_flag_codes: finalAttorneyFlags,
            risk_flag_codes: finalWarningCodes,
            application_type: resultData.application_type,
            franchise_interest: finalFranchise,
            result_json: resultData,
            casl_consent: true,
            casl_consent_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          });
        } catch {
          // ignore
        } finally {
          setIsSaving(false);
        }
        router.push("/results?from=quiz");
      } else {
        setShowEmailGate(true);
      }
    },
    [loggedInUser, supabase, router, returnToResults]
  );

  // Process an option action: returns true if quiz should advance
  const processAction = useCallback(
    (
      opt: QuizOption,
      _answers: Record<string, Answer>
    ): { shouldAdvance: boolean; stopCode?: string } => {
      const action = opt.action || "continue";

      // Stop
      const stopCode = extractStopCode(action);
      if (stopCode) {
        setTimeout(() => setHardStopsTriggered((prev) => [...prev, stopCode]), 0);
        setTimeout(() => setStopCode(stopCode), 280);
        return { shouldAdvance: false, stopCode };
      }

      // Warning
      const warnCode = extractWarningCode(action);
      if (warnCode) {
        setWarningCodes((prev) => [...prev, warnCode]);
        setWarnMsg(opt.warning_message || null);
        return { shouldAdvance: true };
      }

      // Attorney flag
      const attorneyCode = extractAttorneyCode(action);
      if (attorneyCode) {
        setAttorneyFlags((prev) => [...prev, attorneyCode]);
        return { shouldAdvance: true };
      }

      // Flags (franchise, spouse, partnership)
      if (action.includes("flag_franchise_interest")) setFranchiseInterest(true);
      // Other flags are no-ops for now (data is captured in answers)

      // Sub-question jump
      const subTarget = extractSubTarget(action);
      if (subTarget) {
        setTimeout(() => {
          const subIdx = visibleQuestions.findIndex((x) => x.id === subTarget);
          if (subIdx !== -1) {
            setIsAnimating(true);
            setTimeout(() => {
              setIsAnimating(false);
              setCur(subIdx);
              setSelectedIdx(null);
              setWarnMsg(null);
            }, 200);
          }
        }, 280);
        return { shouldAdvance: false };
      }

      // Default: advance
      return { shouldAdvance: true };
    },
    [visibleQuestions]
  );

  // [stopCode state for hard stops]
  const [stopCode, setStopCode] = useState<string | null>(null);

  // Handle select option click
  const handleSelectOpt = useCallback(
    (idx: number) => {
      if (!q || q.type !== "select") return;
      const opt = displayOpts[idx];
      if (!opt) return;

      setSelectedIdx(idx);
      const newAnswers = { ...answers, [q.id]: opt.text };
      setAnswers(newAnswers);

      const result = processAction(opt, newAnswers);

      setTimeout(() => {
        if (result.stopCode) return;

        if (result.shouldAdvance) {
          const nextIdx = cur + 1;
          if (nextIdx >= visibleQuestions.length) {
            handleComplete(
              newAnswers,
              warningCodes,
              attorneyFlags,
              franchiseInterest,
              hardStopsTriggered
            );
          } else {
            advance();
          }
        }
      }, result.stopCode ? 280 : 1200);

      saveDraft(newAnswers, cur, warningCodes, attorneyFlags, franchiseInterest);
    },
    [
      q, displayOpts, answers, cur, visibleQuestions, warningCodes, attorneyFlags,
      franchiseInterest, hardStopsTriggered, processAction, advance, handleComplete, saveDraft
    ]
  );

  // Handle multi-select continue — MUST process action codes for every selected option
  const handleMultiContinue = useCallback(() => {
    if (multiSel.length === 0 || !q) return;

    // Mutual exclusion enforcement for Q0-06 and Q0-10
    let effectiveSel = [...multiSel];
    if (q.id === "Q0-10") {
      const noneIdx = q.options.length - 1;
      if (effectiveSel.includes(noneIdx) && effectiveSel.length > 1) {
        effectiveSel = [noneIdx]; // "None" wins
      }
    } else if (q.id === "Q0-06") {
      const loanIdx = q.options.length - 1;
      if (effectiveSel.includes(loanIdx) && effectiveSel.length > 1) {
        effectiveSel = [loanIdx]; // Business loan = hard stop, alone
      }
    }

    const selected = effectiveSel.map((i) => q.options[i]);
    const newAnswers = { ...answers, [q.id]: selected.map((o) => o.text) };
    setAnswers(newAnswers);

    const newWarnings = [...warningCodes];
    const newFlags = [...attorneyFlags];
    let newHardStops = [...hardStopsTriggered];
    let newFranchise = franchiseInterest;

    for (const opt of selected) {
      const action = opt.action || "continue";

      const stopCode = extractStopCode(action);
      if (stopCode) {
        newHardStops = [...newHardStops, stopCode];
        setHardStopsTriggered(newHardStops);
        setStopCode(stopCode);
        saveDraft(newAnswers, cur, newWarnings, newFlags, newFranchise);
        return;
      }

      const warnCode = extractWarningCode(action);
      if (warnCode && !newWarnings.includes(warnCode)) {
        newWarnings.push(warnCode);
        if (opt.warning_message) setWarnMsg(opt.warning_message);
      }

      const attorneyCode = extractAttorneyCode(action);
      if (attorneyCode && !newFlags.includes(attorneyCode)) {
        newFlags.push(attorneyCode);
      }

      if (action.includes("flag_franchise_interest")) newFranchise = true;
    }

    setWarningCodes(newWarnings);
    setAttorneyFlags(newFlags);
    setFranchiseInterest(newFranchise);
    saveDraft(newAnswers, cur, newWarnings, newFlags, newFranchise);

    const nextIdx = cur + 1;
    if (nextIdx >= visibleQuestions.length) {
      handleComplete(newAnswers, newWarnings, newFlags, newFranchise, newHardStops);
    } else {
      advance();
    }
  }, [multiSel, q, answers, cur, visibleQuestions, warningCodes, attorneyFlags, franchiseInterest, hardStopsTriggered, advance, handleComplete, saveDraft]);

  // Handle email submit
  const handleEmailSubmit = useCallback(async () => {
    if (!email || !email.includes("@")) return;
    setIsSaving(true);
    setSaveError(null);

    const stored = localStorage.getItem("e2go_quiz_result");
    const resultData = stored ? JSON.parse(stored) : {};

    try {
      const { data: session, error } = await supabase
        .from("quiz_sessions")
        .insert({
          user_id: null,
          email,
          outcome: resultData.outcome || "PROCEED",
          score: resultData.score || 80,
          hard_stop_codes: resultData.hard_stops_triggered || [],
          attorney_flag_codes: resultData.attorney_flags || [],
          risk_flag_codes: resultData.warnings || [],
          application_type: resultData.application_type || "solo",
          franchise_interest: resultData.franchise_interest || false,
          result_json: resultData,
          casl_consent: caslConsent,
          casl_consent_at: caslConsent ? new Date().toISOString() : null,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!error && session) {
        try {
          await fetch("/api/email/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              outcome: resultData.outcome,
              result_json: resultData,
              quiz_session_id: session.id,
              franchise_interest: resultData.franchise_interest,
            }),
          });
        } catch {
          // ignore
        }
      }
    } catch {
      setSaveError("Unable to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
    router.push("/results?from=quiz");
  }, [email, caslConsent, supabase, router]);

  // Derived
  const pct = Math.round(((cur + 1) / visibleQuestions.length) * 100);
  const currentSection = q ? SECTIONS[q.section_index] : "";

  const filteredCountries =
    countrySearch.length > 0
      ? TREATY_COUNTRIES.filter((c) =>
          c.toLowerCase().startsWith(countrySearch.toLowerCase())
        ).slice(0, 8)
      : [];

  const isCountry = q?.type === "searchable_country";
  const isMulti = q?.type === "multiselect";
  const isSelect = q?.type === "select";

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------
  if (!authChecked) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
          Loading...
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: hard stop
  // ---------------------------------------------------------------------------
  if (stopCode) {
    const stopText = HARD_STOPS[stopCode] || "Based on your answers, we are unable to proceed. Please consult a qualified immigration attorney.";
    const stopTitle = (() => {
      const titles: Record<string, string> = {
        "PR-01": "Citizenship in a treaty country required",
        "PR-02": "Loan-funded investments require legal review",
        "PR-03": "Investment capital required",
        "PR-04": "Investment below threshold",
        "PR-05": "Documentation required",
        "PR-06": "Active management required",
        "PR-06b": "Three or more partners changes your E-2 classification",
        "PR-07": "This business type does not qualify",
        "PR-08": "Serious convictions require legal assessment",
        "PR-09": "U.S. presence without valid status",
        "PR-PASSIVE-INVEST": "This investment structure does not qualify",
        "PR-NONPROFIT": "Non-profit organisations do not qualify",
      };
      return titles[stopCode] || "Not eligible at this time";
    })();

    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8", maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ padding: "clamp(12px, 4vw, 18px) clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        </div>
        <div style={{ padding: "clamp(32px, 5vw, 56px) clamp(16px, 5vw, 40px)", maxWidth: "560px" }}>
          <div style={{ width: "44px", height: "44px", border: "1px solid rgba(220,60,60,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", color: "rgba(220,60,60,0.65)", fontSize: "20px" }}>✕</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px", lineHeight: 1.3 }}>{stopTitle}</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.5)", lineHeight: 1.7, marginBottom: "28px", maxWidth: "460px" }}>{stopText}</div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setStopCode(null);
                setCur(0);
                setAnswers({});
                setWarningCodes([]);
                setAttorneyFlags([]);
                setFranchiseInterest(false);
                setSelectedIdx(null);
                setWarnMsg(null);
                setSelectedCountry(null);
                setCountrySearch("");
                setHardStopsTriggered([]);
                localStorage.removeItem("e2go_quiz_draft");
              }}
              style={{ padding: "11px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", fontSize: "12px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}
            >
              Start over
            </button>
            <button style={{ padding: "11px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.15)", color: "rgba(245,240,232,0.35)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>
              Find an attorney →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: email gate
  // ---------------------------------------------------------------------------
  if (showEmailGate) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8", maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ padding: "clamp(12px, 4vw, 18px) clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        </div>
        <div style={{ padding: "clamp(32px, 5vw, 56px) clamp(16px, 5vw, 40px)", maxWidth: "480px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "16px" }}>Your result is ready</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px", lineHeight: 1.3 }}>Where should we send your eligibility summary?</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.45)", marginBottom: "32px", lineHeight: 1.6 }}>We will email you a full copy of your result and your personalised next-step summary.</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ width: "100%", padding: "13px 16px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.2)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "12px" }}
          />
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "24px", cursor: "pointer" }}
            onClick={() => setCaslConsent(!caslConsent)}
          >
            <div style={{ width: "16px", height: "16px", border: `1px solid ${caslConsent ? "#C9A84C" : "rgba(201,168,76,0.3)"}`, background: caslConsent ? "#C9A84C" : "transparent", flexShrink: 0, marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {caslConsent && <span style={{ color: "#0a0a0a", fontSize: "11px" }}>✓</span>}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.6 }}>Send me occasional updates about the E-2 process. You can unsubscribe at any time.</div>
          </div>
          {saveError && <div style={{ fontSize: "13px", color: "rgba(220,60,60,0.8)", marginBottom: "12px" }}>{saveError}</div>}
          <button
            onClick={handleEmailSubmit}
            disabled={!email.includes("@") || isSaving}
            style={{ width: "100%", padding: "14px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: email.includes("@") && !isSaving ? "pointer" : "not-allowed", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: email.includes("@") && !isSaving ? 1 : 0.35 }}
          >
            {isSaving ? "Saving..." : "View my result →"}
          </button>
          <button
            onClick={() => router.push("/results?from=quiz")}
            style={{ width: "100%", padding: "12px", background: "transparent", border: "none", color: "rgba(245,240,232,0.25)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.06em", fontFamily: "'DM Sans', sans-serif", marginTop: "8px" }}
          >
            Skip — view result without saving
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: no question
  // ---------------------------------------------------------------------------
  if (!q) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#f5f0e8", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading...</div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: main quiz
  // ---------------------------------------------------------------------------
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8", maxWidth: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ padding: "clamp(12px, 4vw, 18px) clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ flex: 1, maxWidth: "clamp(100px, 30vw, 240px)", margin: "0 clamp(12px, 3vw, 24px)" }}>
          <div style={{ height: "1px", background: "rgba(201,168,76,0.15)" }}>
            <div style={{ height: "100%", background: "#C9A84C", width: `${pct}%`, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
          </div>
          <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.65)", marginTop: "5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Question {cur + 1} of {visibleQuestions.length}
          </div>
        </div>
        <div
          style={{ fontSize: "11px", color: "rgba(245,240,232,0.55)", letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(245,240,232,0.85)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,240,232,0.55)")}
        >
          Save & exit
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 0, padding: "0 clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.08)", overflowX: "auto", whiteSpace: "nowrap" }}>
        {SECTIONS.map((s, i) => (
          <div
            key={s}
            onClick={
              i < q.section_index
                ? () => {
                    const firstQ = visibleQuestions.findIndex((x) => x.section_index === i);
                    if (firstQ !== -1) {
                      setCur(firstQ);
                      setSelectedIdx(null);
                      setWarnMsg(null);
                      setMultiSel([]);
                    }
                  }
                : undefined
            }
            onMouseEnter={i < q.section_index ? (e) => (e.currentTarget.style.color = "rgba(245,240,232,0.65)") : undefined}
            onMouseLeave={i < q.section_index ? (e) => (e.currentTarget.style.color = "rgba(245,240,232,0.45)") : undefined}
            style={{
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: i === q.section_index ? "#C9A84C" : i < q.section_index ? "rgba(245,240,232,0.45)" : "rgba(245,240,232,0.4)",
              padding: "10px 0",
              marginRight: "18px",
              borderBottom: `2px solid ${i === q.section_index ? "#C9A84C" : i < q.section_index ? "rgba(201,168,76,0.25)" : "transparent"}`,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              cursor: i < q.section_index ? "pointer" : "default",
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={{ padding: "0 clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#C9A84C", padding: "10px 0" }}>
          Section {q.section_index + 1} of {SECTIONS.length} — {currentSection}
        </div>
      </div>

      {/* Question content */}
      <div style={{ padding: "clamp(28px, 5vw, 44px) clamp(16px, 5vw, 40px) 32px", maxWidth: "580px", width: "100%", opacity: isAnimating ? 0 : 1, transition: "opacity 0.15s" }}>
        {/* Question type badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.7)", marginBottom: "18px" }}>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#C9A84C" }} />
          {q.is_sub ? "Follow-up" : currentSection}
        </div>

        {/* Question text */}
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.3, marginBottom: "8px", letterSpacing: "-0.01em" }}>
          {q.question}
        </div>

        {/* Helper text */}
        {q.helper_text && (
          <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.55)", lineHeight: 1.65, marginBottom: "28px", maxWidth: "460px" }}>
            {q.helper_text}
          </div>
        )}

        {/* Warning message */}
        {warnMsg && (
          <div style={{ display: "flex", gap: "9px", padding: "11px 14px", border: "1px solid rgba(201,168,76,0.22)", background: "rgba(201,168,76,0.04)", marginBottom: "16px" }}>
            <div style={{ color: "#C9A84C", fontSize: "14px", flexShrink: 0 }}>!</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.55)", lineHeight: 1.6 }}>{warnMsg}</div>
          </div>
        )}

        {/* Country search */}
        {isCountry && (
          <>
            <input
              value={countrySearch}
              onChange={(e) => {
                setCountrySearch(e.target.value);
                setSelectedCountry(null);
                setHighlightedIdx(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIdx((prev) => Math.min(prev + 1, filteredCountries.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIdx((prev) => Math.max(prev - 1, 0));
                }
                if (e.key === "Enter" && highlightedIdx >= 0) {
                  e.preventDefault();
                  const country = filteredCountries[highlightedIdx];
                  // Fix C: Treaty country validation
                  if (!TREATY_COUNTRIES.includes(country)) {
                    setHardStopsTriggered((prev) => [...prev, "PR-NON-TREATY"]);
                    setStopCode("PR-NON-TREATY");
                    return;
                  }
                  setSelectedCountry(country);
                  setCountrySearch(country);
                  setAnswers((prev) => ({ ...prev, [q.id]: country }));
                  setTimeout(() => advance(), 300);
                }
                if (e.key === "Escape") {
                  setCountrySearch("");
                  setHighlightedIdx(-1);
                }
              }}
              placeholder="Search your country..."
              style={{ width: "100%", maxWidth: "420px", padding: "13px 16px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.2)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "8px" }}
            />
            {filteredCountries.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px", background: "#0a0a0a", border: "1px solid rgba(201,168,76,0.2)", zIndex: 50, position: "relative" }}>
                {filteredCountries.map((c, idx) => (
                  <div
                    key={c}
                    id={`country-option-${idx}`}
                    onClick={() => {
                      // Fix C: Treaty country validation
                      if (!TREATY_COUNTRIES.includes(c)) {
                        setHardStopsTriggered((prev) => [...prev, "PR-NON-TREATY"]);
                        setStopCode("PR-NON-TREATY");
                        return;
                      }
                      setSelectedCountry(c);
                      setCountrySearch(c);
                      setAnswers((prev) => ({ ...prev, [q.id]: c }));
                      setTimeout(() => advance(), 300);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(201,168,76,0.08)";
                      e.currentTarget.style.color = "#f5f0e8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = highlightedIdx === idx ? "rgba(201,168,76,0.15)" : selectedCountry === c ? "rgba(201,168,76,0.08)" : "#0a0a0a";
                      e.currentTarget.style.color = "#f5f0e8";
                    }}
                    style={{ padding: "10px 14px", background: highlightedIdx === idx ? "rgba(201,168,76,0.15)" : selectedCountry === c ? "rgba(201,168,76,0.08)" : "#0a0a0a", border: `1px solid ${selectedCountry === c ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.1)"}`, color: "#f5f0e8", fontSize: "13px", cursor: "pointer", transition: "all 0.12s", borderRadius: 0 }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Select options */}
        {isSelect && displayOpts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "28px" }}>
            {displayOpts.map((o, i) => (
              <button
                key={i}
                onClick={() => handleSelectOpt(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 16px",
                  background: selectedIdx === i ? "rgba(201,168,76,0.09)" : "rgba(201,168,76,0.02)",
                  border: `1px solid ${selectedIdx === i ? "#C9A84C" : "rgba(201,168,76,0.14)"}`,
                  color: selectedIdx === i ? "#f5f0e8" : "rgba(245,240,232,0.75)",
                  fontSize: "14px",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 0,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  transition: "all 0.14s",
                  gap: "12px",
                }}
              >
                <span>{o.text}</span>
                <div style={{ width: "16px", height: "16px", border: `1px solid ${selectedIdx === i ? "#C9A84C" : "rgba(201,168,76,0.35)"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selectedIdx === i && <div style={{ width: "7px", height: "7px", background: "#C9A84C" }} />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Multi-select options */}
        {isMulti && q.options.length > 0 && (
          <>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", marginBottom: "14px", letterSpacing: "0.04em" }}>Select all that apply</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "28px" }}>
              {q.options.map((o, i) => {
                const sel = multiSel.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      // Mutual exclusion logic
                      if (q.id === "Q0-10") {
                        const isNoneOption = i === q.options.length - 1; // last option = "None"
                        if (isNoneOption) {
                          // Selecting "None" deselects all others
                          setMultiSel(sel ? [] : [i]);
                        } else {
                          // Selecting any tie deselects "None"
                          setMultiSel((prev) => {
                            const filtered = prev.filter((x) => x !== q.options.length - 1);
                            return sel ? filtered.filter((x) => x !== i) : [...filtered, i];
                          });
                        }
                      } else if (q.id === "Q0-06") {
                        const isLoanOption = i === q.options.length - 1; // last option = business loan
                        if (isLoanOption) {
                          // Business loan = hard stop, select only this
                          setMultiSel([i]);
                        } else {
                          // Deselect loan if selecting anything else
                          setMultiSel((prev) => {
                            const filtered = prev.filter((x) => x !== q.options.length - 1);
                            return sel ? filtered.filter((x) => x !== i) : [...filtered, i];
                          });
                        }
                      } else {
                        setMultiSel((prev) => (sel ? prev.filter((x) => x !== i) : [...prev, i]));
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "13px 16px",
                      background: sel ? "rgba(201,168,76,0.09)" : "rgba(201,168,76,0.02)",
                      border: `1px solid ${sel ? "#C9A84C" : "rgba(201,168,76,0.14)"}`,
                      color: sel ? "#f5f0e8" : "rgba(245,240,232,0.75)",
                      fontSize: "14px",
                      cursor: "pointer",
                      textAlign: "left",
                      borderRadius: 0,
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      transition: "all 0.14s",
                      gap: "12px",
                    }}
                  >
                    <span>{o.text}</span>
                    <div style={{ width: "16px", height: "16px", border: `1px solid ${sel ? "#C9A84C" : "rgba(201,168,76,0.35)"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <div style={{ width: "7px", height: "7px", background: "#C9A84C" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Warning continue anyway button */}
        {(isSelect || isCountry) && warnMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
            <button
              onClick={() => {
                const nextIdx = cur + 1;
                if (nextIdx >= visibleQuestions.length) {
                  handleComplete(answers, warningCodes, attorneyFlags, franchiseInterest, hardStopsTriggered);
                } else {
                  advance();
                }
              }}
              style={{ padding: "11px 26px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}
            >
              Continue anyway
            </button>
          </div>
        )}

        {/* Tooltip */}
        {q.tooltip && (
          <div style={{ display: "flex", gap: "8px", marginTop: "22px", padding: "11px 14px", border: "1px solid rgba(201,168,76,0.18)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "13px", color: "rgba(201,168,76,0.5)", flexShrink: 0 }}>i</div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", lineHeight: 1.65 }}>{q.tooltip}</div>
          </div>
        )}

        {/* Bottom navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(201,168,76,0.08)',
        }}>
          {cur > 0 ? (
            <button
              onClick={() => { setCur(c => c - 1); setSelectedIdx(null); setWarnMsg(null); setMultiSel([]); }}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(245,240,232,0.5)', fontSize: '13px',
                letterSpacing: '0.04em', cursor: 'pointer',
                padding: '8px 0', fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >← Back</button>
          ) : <div />}

          {isMulti && multiSel.length > 0 && (
            <button onClick={handleMultiContinue} style={{
              padding: '11px 26px', background: '#C9A84C',
              border: 'none', color: '#0a0a0a', fontSize: '12px',
              fontWeight: 500, cursor: 'pointer', letterSpacing: '0.07em',
              textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif",
              borderRadius: 0,
            }}>Continue →</button>
          )}
        </div>
      </div>
    </div>
  );
}
