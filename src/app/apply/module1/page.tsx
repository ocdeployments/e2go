"use client";

import { useEffect, useState } from "react";
import { useTrackSectionVisit } from "@/hooks/useTrackSectionVisit";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import PreFilledField from "@/components/PreFilledField";

interface QuizSession {
  id: string;
  first_name: string | null;
  last_name: string | null;
  application_type: "solo" | "partnership" | null;
  partner_name?: string | null;
  partner_email?: string | null;
  spouse_name?: string | null;
  spouse_dob?: string | null;
  children?: { name: string; dob: string }[] | null;
  outcome: string;
  result_json?: { target_date?: string } | null;
}

/**
 * Convert quiz target-date range to an approximate working_target_date.
 * Returns null for "Not sure yet" or missing data.
 */
function computeTargetDate(targetDateRange: string | null | undefined): string | null {
  if (!targetDateRange) return null;
  const now = new Date();
  let monthsToAdd = 0;
  if (targetDateRange.includes("Within 6 months")) monthsToAdd = 6;
  else if (targetDateRange.includes("6 to 12")) monthsToAdd = 9;
  else if (targetDateRange.includes("12 to 24")) monthsToAdd = 18;
  else return null; // "Not sure yet"
  const target = new Date(now);
  target.setMonth(target.getMonth() + monthsToAdd);
  return target.toISOString().split("T")[0];
}

const REFERRAL_CATEGORIES = [
  { id: "franchise", title: "Franchise Consultant", help: "Help finding an E-2 compatible business", data: "Budget and category preferences" },
  { id: "immigration", title: "Immigration Consultant", help: "For complex cases that need legal guidance", data: "Application status and risk flags" },
  { id: "banking", title: "Cross-border Banking", help: "Opening your U.S. business bank account", data: "Business type and formation state" },
  { id: "accountant", title: "Cross-border Accountant", help: "Canadian departure tax and U.S. filings", data: "Investment amount and source of funds" },
  { id: "business_formation", title: "Business Formation", help: "LLC registration and EIN application", data: "Target state and business structure" },
];

export default function Module1Page() {
  useTrackSectionVisit("module1");

  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);

  // Screen 1 State
  const [applicationType, setApplicationType] = useState<"solo" | "partnership">("solo");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  // Screen 2 State
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Screen 3 State
  const [caslConsent, setCaslConsent] = useState<boolean | null>(null);

  // Screen 4 State
  const [referralConsents, setReferralConsents] = useState<Record<string, boolean>>({
    franchise: false,
    immigration: false,
    banking: false,
    accountant: false,
    business_formation: false,
  });

  // Screen 5 State
  const [familyComposition, setFamilyComposition] = useState<"individual" | "couple" | "family">("individual");
  const [spouseName, setSpouseName] = useState("");
  const [spouseDob, setSpouseDob] = useState("");
  const [children, setChildren] = useState<{ name: string; dob: string }[]>([]);

  useEffect(() => {
    const loadSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/apply/module1");
        return;
      }

      const { data: session, error } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !session) {
        router.push("/quiz");
        return;
      }

      setQuizSession(session);
      setApplicationType(session.application_type || "solo");
      setPartnerName(session.partner_name || "");
      setPartnerEmail(session.partner_email || "");
      setFamilyComposition(session.family_type || "individual");
      setSpouseName(session.spouse_name || "");
      setSpouseDob(session.spouse_dob || "");
      setChildren(session.children || []);

      setLoading(false);
    };

    loadSession();
  }, [supabase, router]);

  const handleNext = async () => {
    if (step === 6) {
      await saveApplicationRecord();
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      router.push("/dashboard");
      return;
    }
    setStep((prev) => prev - 1);
  };

  const saveConsentLogs = async (userId: string) => {
    // Mock IP hash for demo/local
    const ipHash = "local-hash";

    if (tosAccepted) {
      await supabase.from("consent_log").insert({
        user_id: userId,
        consent_type: "tos",
        consent_given: true,
        ip_hash: ipHash,
      });
    }
    if (privacyAccepted) {
      await supabase.from("consent_log").insert({
        user_id: userId,
        consent_type: "privacy",
        consent_given: true,
        ip_hash: ipHash,
      });
    }
  };

  const saveCaslConsent = async (userId: string) => {
    if (caslConsent !== null) {
      await supabase.from("profiles").update({
        casl_marketing_consent: caslConsent,
      }).eq("id", userId);
    }
  };

  const saveReferralConsents = async (userId: string) => {
    const inserts = Object.entries(referralConsents).map(([category, consentGiven]) => ({
      user_id: userId,
      category,
      consent_given: consentGiven,
    }));

    if (inserts.length > 0) {
      await supabase.from("referral_consents").upsert(inserts, { onConflict: "user_id,category" });
    }
  };

  const saveApplicationRecord = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await saveConsentLogs(user.id);
      await saveCaslConsent(user.id);
      await saveReferralConsents(user.id);

      // Create or update application record
      const { data: existingApp } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingApp) {
        await supabase
          .from("applications")
          .update({
            application_type: applicationType,
            processing_path: applicationType === "partnership" ? "partnership" : "solo",
            family_composition: familyComposition,
            working_target_date: computeTargetDate(quizSession?.result_json?.target_date),
            module_1_complete: true,
          })
          .eq("id", existingApp.id);
      } else {
        await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            application_type: applicationType,
            processing_path: applicationType === "partnership" ? "partnership" : "solo",
            family_composition: familyComposition,
            working_target_date: computeTargetDate(quizSession?.result_json?.target_date),
            module_1_complete: true,
            status: "in_progress",
          });
      }

      await supabase
        .from("application_lifecycle")
        .upsert({
          user_id: user.id,
          first_entry: new Date().toISOString(),
          module1_completed_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      router.push("/apply/module2");
    } catch (error) {
      console.error("Error saving application record:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#C9A84C] font-[DM_Sans] text-sm tracking-widest uppercase">Loading...</div>
      </div>
    );
  }

  const fullName = `${quizSession?.first_name || ""} ${quizSession?.last_name || ""}`.trim();

  const isStep1Valid = applicationType === "solo" || (applicationType === "partnership" && partnerName && partnerEmail);
  const isStep2Valid = tosAccepted && privacyAccepted;
  const isStep3Valid = caslConsent !== null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] font-[DM_Sans]">
      {/* Decorative Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-[#0a0a0a] border-b border-[rgba(201,168,76,0.2)]">
        <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-4xl mx-auto">
          <span className="font-['Cormorant_Garamond'] text-xl font-normal text-[#f5f0e8]">E2go<span className="text-[#C9A84C]">.app</span></span>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[rgba(245,240,232,0.45)]">Step {step} of 6</div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="fixed top-16 left-0 right-0 h-[3px] bg-[rgba(245,240,232,0.1)] z-10">
        <div className="h-full bg-[#C9A84C] transition-all duration-500" style={{ width: `${(step / 6) * 100}%` }} />
      </div>

      <main className="relative z-10 pt-24 pb-12 px-6 md:px-12 max-w-4xl mx-auto">
        {/* SCREEN 1: Welcome + Application Type */}
        {step === 1 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 1 — Onboarding</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              Welcome{fullName ? `, ${fullName}` : ""}
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              Quiz outcome: <span className="text-[#f5f0e8] capitalize">{quizSession?.outcome || "qualified"}</span>.
              Let&apos;s confirm your application details to begin building your package.
            </p>

            <div className="mb-8">
              <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-4">
                Application Type <span className="text-[#C9A84C]">*</span>
              </label>
              <div className="space-y-3">
                {(["solo", "partnership"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setApplicationType(type)}
                    className={`w-full text-left p-4 border transition-all duration-200 ${
                      applicationType === type
                        ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]"
                        : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"
                    }`}
                  >
                    <div className="text-[15px] font-medium text-[#f5f0e8] capitalize mb-1">{type}</div>
                    <div className="text-[13px] text-[#f5f0e8]/50">
                      {type === "solo" ? "One investor applying alone" : "Two or more investors applying together"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {applicationType === "partnership" && (
              <div className="space-y-6 mb-8 border-t border-[rgba(201,168,76,0.1)] pt-8">
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">
                    Partner Full Legal Name <span className="text-[#C9A84C]">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full max-w-[480px] p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[15px] outline-none focus:border-[#C9A84C] transition-colors"
                    placeholder="Enter partner's legal name"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">
                    Partner Email <span className="text-[#C9A84C]">*</span>
                  </label>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    className="w-full max-w-[480px] p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[15px] outline-none focus:border-[#C9A84C] transition-colors"
                    placeholder="partner@example.com"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!isStep1Valid}
                className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all duration-200 ${
                  isStep1Valid
                    ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]"
                    : "bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed"
                }`}
              >
                Begin my application →
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: Terms of Service + Privacy Policy */}
        {step === 2 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 1 — Step 2</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              Terms & Data Retention
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8">
              Please review and accept our terms. You can read the full{" "}
              <Link href="/terms" className="text-[#C9A84C] underline hover:text-[#D4BC6A]">Terms of Service</Link> and{" "}
              <Link href="/privacy" className="text-[#C9A84C] underline hover:text-[#D4BC6A]">Privacy Policy</Link>.
            </p>

            <div className="border-l-[3px] border-[#C9A84C] bg-[rgba(201,168,76,0.04)] p-6 mb-8">
              <p className="text-[14px] text-[#f5f0e8]/80 leading-relaxed">
                <span className="text-[#C9A84C] font-medium">Data Retention Notice:</span> Your application data is retained until 90 days after your visa outcome is confirmed, then permanently deleted. You can download your complete record at any time.
              </p>
            </div>

            <div className="space-y-6 mb-8">
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="relative mt-1">
                  <input
                    type="checkbox"
                    checked={tosAccepted}
                    onChange={(e) => setTosAccepted(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border border-[rgba(201,168,76,0.4)] bg-transparent peer-checked:bg-[#C9A84C] transition-colors" />
                  {tosAccepted && (
                    <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-[#0a0a0a] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <span className="text-[14px] text-[#f5f0e8]/80 group-hover:text-[#f5f0e8] transition-colors pt-0.5">
                  I have read and agree to the <Link href="/terms" className="text-[#C9A84C] underline">Terms of Service</Link>
                </span>
              </label>

              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="relative mt-1">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border border-[rgba(201,168,76,0.4)] bg-transparent peer-checked:bg-[#C9A84C] transition-colors" />
                  {privacyAccepted && (
                    <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-[#0a0a0a] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <span className="text-[14px] text-[#f5f0e8]/80 group-hover:text-[#f5f0e8] transition-colors pt-0.5">
                  I have read and agree to the <Link href="/privacy" className="text-[#C9A84C] underline">Privacy Policy</Link>
                </span>
              </label>
            </div>

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!isStep2Valid}
                className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all duration-200 ${
                  isStep2Valid
                    ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]"
                    : "bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed"
                }`}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 3: CASL Marketing Consent */}
        {step === 3 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 1 — Step 3</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-4">
              Stay informed
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              Would you like to receive updates on E-2 processing times, policy changes, and preparation tips? You can unsubscribe at any time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setCaslConsent(true)}
                className={`text-left p-6 border transition-all duration-200 ${
                  caslConsent === true
                    ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]"
                    : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"
                }`}
              >
                <div className="text-[16px] font-medium text-[#f5f0e8] mb-2">Yes, keep me informed</div>
                <div className="text-[13px] text-[#f5f0e8]/50">Receive helpful updates and preparation tips.</div>
              </button>

              <button
                onClick={() => setCaslConsent(false)}
                className={`text-left p-6 border transition-all duration-200 ${
                  caslConsent === false
                    ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]"
                    : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"
                }`}
              >
                <div className="text-[16px] font-medium text-[#f5f0e8] mb-2">No thanks</div>
                <div className="text-[13px] text-[#f5f0e8]/50">Just the essential application updates.</div>
              </button>
            </div>

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!isStep3Valid}
                className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all duration-200 ${
                  isStep3Valid
                    ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]"
                    : "bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed"
                }`}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 4: Referral Consent */}
        {step === 4 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 1 — Step 4</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-4">
              Connect you with the right experts
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              At key points in your journey, we can introduce you to specialists who work with E-2 investors. Each introduction is your choice — we will never share your details without asking first. E2go may receive a referral fee.
            </p>

            <div className="space-y-4 mb-8">
              {REFERRAL_CATEGORIES.map((cat) => (
                <label key={cat.id} className="flex items-start gap-4 p-4 border border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)] transition-colors cursor-pointer">
                  <div className="relative mt-1">
                    <input
                      type="checkbox"
                      checked={!!referralConsents[cat.id]}
                      onChange={(e) => setReferralConsents(prev => ({ ...prev, [cat.id]: e.target.checked }))}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border border-[rgba(201,168,76,0.4)] bg-transparent peer-checked:bg-[#C9A84C] transition-colors" />
                    {!!referralConsents[cat.id] && (
                      <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-[#0a0a0a] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-medium text-[#f5f0e8] mb-1">{cat.title}</div>
                    <div className="text-[13px] text-[#f5f0e8]/50 mb-1">{cat.help}</div>
                    <div className="text-[12px] text-[#C9A84C]/70 uppercase tracking-wider">Data shared: {cat.data}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-[14px] font-medium uppercase tracking-[0.12em] hover:bg-[#D4BC6A] transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 5: Family Composition */}
        {step === 5 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 1 — Step 5</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-4">
              Family Composition
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8">
              Confirm or update the family details from your eligibility check. This data goes directly into your application record.
            </p>

            <div className="mb-8">
              <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-4">
                Composition <span className="text-[#C9A84C]">*</span>
              </label>
              <div className="space-y-3 max-w-[480px]">
                {([
                  { value: "individual", label: "Individual", desc: "Just me" },
                  { value: "couple", label: "Couple", desc: "Spouse included" },
                  { value: "family", label: "Family", desc: "Spouse and dependent children" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFamilyComposition(opt.value)}
                    className={`w-full text-left p-4 border transition-all duration-200 ${
                      familyComposition === opt.value
                        ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]"
                        : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"
                    }`}
                  >
                    <div className="text-[15px] font-medium text-[#f5f0e8] mb-1">{opt.label}</div>
                    <div className="text-[13px] text-[#f5f0e8]/50">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {(familyComposition === "couple" || familyComposition === "family") && (
              <PreFilledField
                questionId="spouse_details"
                label="Spouse Details"
                prefillValue={spouseName ? `${spouseName} ${spouseDob ? `(DOB: ${spouseDob})` : ""}` : null}
                prefillNote="From your eligibility check"
              >
                <div className="space-y-4">
                  <input
                    type="text"
                    value={spouseName}
                    onChange={(e) => setSpouseName(e.target.value)}
                    className="w-full p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[15px] outline-none focus:border-[#C9A84C] transition-colors"
                    placeholder="Spouse legal name"
                  />
                  <input
                    type="date"
                    value={spouseDob}
                    onChange={(e) => setSpouseDob(e.target.value)}
                    className="w-full p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[15px] outline-none focus:border-[#C9A84C] transition-colors"
                  />
                </div>
              </PreFilledField>
            )}

            {familyComposition === "family" && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60">
                    Dependent Children
                  </label>
                  <button
                    type="button"
                    onClick={() => setChildren([...children, { name: "", dob: "" }])}
                    className="text-[12px] text-[#C9A84C] hover:text-[#D4BC6A] uppercase tracking-wider font-medium"
                  >
                    + Add Child
                  </button>
                </div>

                {children.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setChildren([{ name: "", dob: "" }])}
                    className="w-full py-8 border border-dashed border-[rgba(201,168,76,0.3)] text-[#f5f0e8]/40 hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors text-[14px] uppercase tracking-widest"
                  >
                    Add a dependent child
                  </button>
                )}

                <div className="space-y-4">
                  {children.map((child, idx) => (
                    <div key={idx} className="p-4 border border-[rgba(201,168,76,0.15)] bg-[rgba(255,255,255,0.02)]">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] uppercase tracking-wider text-[#C9A84C]/70">Child {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setChildren(children.filter((_, i) => i !== idx))}
                          className="text-[11px] uppercase tracking-wider text-[#ef4444] hover:text-[#f87171]"
                        >
                          Remove
                        </button>
                </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={child.name}
                          onChange={(e) => {
                            const updated = [...children];
                            updated[idx].name = e.target.value;
                            setChildren(updated);
                          }}
                          className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[14px] outline-none focus:border-[#C9A84C] transition-colors"
                          placeholder="Child's legal name"
                        />
                        <input
                          type="date"
                          value={child.dob}
                          onChange={(e) => {
                            const updated = [...children];
                            updated[idx].dob = e.target.value;
                            setChildren(updated);
                          }}
                          className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[14px] outline-none focus:border-[#C9A84C] transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-[14px] font-medium uppercase tracking-[0.12em] hover:bg-[#D4BC6A] transition-colors"
              >
                Confirm and Continue →
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 6: Application Record Creation */}
        {step === 6 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 1 — Step 6</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              Creating your application record
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed max-w-xl mx-auto mb-12">
              We are finalizing your {applicationType} application profile with your selected family composition and preferences.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 mb-8">
              <div className="w-8 h-8 border-2 border-[rgba(201,168,76,0.2)] border-t-[#C9A84C] rounded-full animate-spin" />
              <span className="text-[13px] uppercase tracking-widest text-[#f5f0e8]/50">Saving your progress...</span>
            </div>

            {saving && (
              <p className="text-[#C9A84C] text-[14px]">
                Redirecting to Module 2...
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}