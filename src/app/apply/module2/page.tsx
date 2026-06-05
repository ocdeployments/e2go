"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const BACKGROUND_OPTIONS = [
  { id: "management", label: "Management / Operations" },
  { id: "healthcare", label: "Healthcare / Social Services" },
  { id: "food", label: "Food & Beverage" },
  { id: "retail", label: "Retail / Customer Service" },
  { id: "tech", label: "Technology" },
  { id: "finance", label: "Finance / Accounting" },
  { id: "education", label: "Education" },
  { id: "other", label: "Other" },
];

const BUDGET_OPTIONS = [
  { id: "75-100", label: "$75K – $100K" },
  { id: "100-150", label: "$100K – $150K" },
  { id: "150-200", label: "$150K – $200K" },
  { id: "200-350", label: "$200K – $350K" },
  { id: "350-500", label: "$350K – $500K" },
  { id: "500+", label: "$500K+" },
];

const STATE_OPTIONS = [
  { id: "FL", label: "Florida" },
  { id: "TX", label: "Texas" },
  { id: "CA", label: "California" },
  { id: "NY", label: "New York" },
  { id: "other", label: "Other specific" },
  { id: "any", label: "Open to any state" },
];

const BUSINESS_OPTIONS = [
  { id: "know_exactly", label: "Yes — I know exactly what I want" },
  { id: "some_ideas", label: "Yes — I have some ideas" },
  { id: "need_guidance", label: "No — I need guidance" },
  { id: "open_franchise", label: "I am open to a franchise" },
];

const CATEGORIES = [
  { id: "senior_care", name: "Senior Care (Non-Medical)", complexity: "green" as const, minInvestment: "$75K", employees: "2-4", description: "Companionship and personal care services.", franchise: true },
  { id: "commercial_cleaning", name: "Commercial Cleaning", complexity: "green" as const, minInvestment: "$50K", employees: "3-5", description: "Office and retail facility cleaning services.", franchise: true },
  { id: "retail_store", name: "Retail Store", complexity: "green" as const, minInvestment: "$100K", employees: "2-3", description: "Storefront retail or e-commerce with warehouse.", franchise: true },
  { id: "it_consulting", name: "IT Consulting / Software", complexity: "amber" as const, minInvestment: "$100K", employees: "3+", description: "Technology consulting with management structure.", franchise: false },
  { id: "restaurant", name: "Restaurant / Food Service", complexity: "amber" as const, minInvestment: "$150K", employees: "5-10", description: "Restaurant, cafe, or catering business.", franchise: true },
  { id: "childcare", name: "Childcare / Daycare", complexity: "amber" as const, minInvestment: "$100K", employees: "4-6", description: "Licensed childcare facility or after-school program.", franchise: true },
  { id: "home_health", name: "Home Health Care (Medical)", complexity: "red" as const, minInvestment: "$150K", employees: "5+", description: "Skilled nursing requiring state certification.", franchise: true },
];

const INCOMPATIBLE_BUSINESSES = [
  { id: "cannabis", name: "Cannabis / Dispensary", reason: "Federally illegal in the U.S. — not E-2 eligible" },
  { id: "passive_re", name: "Passive Real Estate", reason: "Must be an active operating enterprise" },
  { id: "mlm", name: "MLM / Pyramid Schemes", reason: "Not considered a real operating enterprise" },
];

const BUSINESS_EXAMPLES: Record<string, { name: string; investment: string; employees: string; franchise: boolean; matchScore: number }[]> = {
  senior_care: [
    { name: "Home Instead Senior Care", investment: "$50K–$75K", employees: "3-5", franchise: true, matchScore: 95 },
    { name: "Visiting Angels", investment: "$50K–$70K", employees: "3-5", franchise: true, matchScore: 92 },
    { name: "Independent Non-Medical Care", investment: "$40K–$60K", employees: "2-4", franchise: false, matchScore: 88 },
  ],
  commercial_cleaning: [
    { name: "Jan-Pro Cleaning Systems", investment: "$30K–$80K", employees: "3-6", franchise: true, matchScore: 90 },
    { name: "Coverall Commercial Cleaning", investment: "$40K–$65K", employees: "3-5", franchise: true, matchScore: 89 },
    { name: "Independent B2B Cleaning", investment: "$30K–$50K", employees: "2-4", franchise: false, matchScore: 85 },
  ],
  retail_store: [
    { name: "Ace Hardware Franchise", investment: "$150K–$400K", employees: "4-8", franchise: true, matchScore: 88 },
    { name: "Boutique Clothing Store", investment: "$80K–$150K", employees: "2-4", franchise: false, matchScore: 82 },
    { name: "Specialty Gift Shop", investment: "$60K–$100K", employees: "2-3", franchise: false, matchScore: 80 },
  ],
};

export default function Module2Page() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Screen 1 State
  const [background, setBackground] = useState("");
  const [budget, setBudget] = useState("");
  const [statePref, setStatePref] = useState("");
  const [businessInMind, setBusinessInMind] = useState("");
  const [specificBusinessDesc, setSpecificBusinessDesc] = useState("");

  // Screen 2 State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Screen 3 State
  const [shortlist, setShortlist] = useState<string[]>([]);

  // Screen 4 State (Referral)
  const [franchiseReferral, setFranchiseReferral] = useState<boolean | null>(null);
  const [module1ReferralConsent, setModule1ReferralConsent] = useState<Record<string, boolean> | null>(null);

  // Screen 5 State (Gap)
  const [gapAdvisory, setGapAdvisory] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/apply/module2");
        return;
      }

      const { data: lifecycle } = await supabase
        .from("application_lifecycle")
        .select("module1_completed_at")
        .eq("user_id", user.id)
        .single();

      if (!lifecycle?.module1_completed_at) {
        router.push("/apply/module1");
        return;
      }

      // Load existing answers
      const { data: answers } = await supabase
        .from("answers")
        .select("question_key, answer_value")
        .eq("user_id", user.id)
        .like("question_key", "M2-%");

      if (answers) {
        answers.forEach((a: { question_key: string; answer_value: string }) => {
          if (a.question_key === "M2-background") setBackground(a.answer_value);
          if (a.question_key === "M2-budget") setBudget(a.answer_value);
          if (a.question_key === "M2-state") setStatePref(a.answer_value);
          if (a.question_key === "M2-business_in_mind") setBusinessInMind(a.answer_value);
          if (a.question_key === "M2-specific_business") setSpecificBusinessDesc(a.answer_value);
        });
      }

      // Check Module 1 referral consent
      const { data: consents } = await supabase
        .from("referral_consents")
        .select("category, consent_given")
        .eq("user_id", user.id);

      if (consents) {
        const consentMap: Record<string, boolean> = {};
        consents.forEach((c: { category: string; consent_given: boolean }) => { consentMap[c.category] = c.consent_given; });
        setModule1ReferralConsent(consentMap);
      }

      setLoading(false);
    };
    init();
  }, [supabase, router]);

  const saveAnswer = async (key: string, value: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("answers").upsert({
      user_id: user.id,
      question_key: key,
      answer_value: value,
      answered_at: new Date().toISOString(),
    }, { onConflict: "user_id,question_key" });
  };

  const handleNext = async () => {
    if (step === 6) {
      await completeModule2();
      return;
    }

    setSaving(true);
    if (step === 1) {
      await saveAnswer("M2-background", background);
      await saveAnswer("M2-budget", budget);
      await saveAnswer("M2-state", statePref);
      await saveAnswer("M2-business_in_mind", businessInMind);
      if (businessInMind === "know_exactly" || businessInMind === "some_ideas") {
        await saveAnswer("M2-specific_business", specificBusinessDesc);
      }
    } else if (step === 2) {
      await saveAnswer("M2-categories", JSON.stringify(selectedCategories));
    } else if (step === 3) {
      await saveAnswer("M2-shortlist", JSON.stringify(shortlist));
    }

    setSaving(false);
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      router.push("/apply/module1");
      return;
    }
    setStep((prev) => prev - 1);
  };

  const completeModule2 = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Gap detection logic
    let gapFlag = null;
    if (background === "healthcare" && selectedCategories.includes("food")) {
      gapFlag = "Healthcare background + Food & Beverage business requires demonstration of transferable management skills.";
    } else if (background === "tech" && selectedCategories.includes("retail_store")) {
      gapFlag = "Technology background + Retail business requires clear operational management plan.";
    }

    if (gapFlag) {
      setGapAdvisory(gapFlag);
      await supabase.from("applications").update({ experience_gap_flag: gapFlag }).eq("user_id", user.id);
    }

    await supabase.from("applications").update({
      module_2_complete: true,
      business_shortlist: shortlist,
      specific_business_description: specificBusinessDesc || null,
    }).eq("user_id", user.id);

    await supabase.from("application_lifecycle").upsert({
      user_id: user.id,
      module2_completed_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    router.push("/apply/module3");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#C9A84C] font-[DM_Sans] text-sm tracking-widest uppercase">Loading...</div>
      </div>
    );
  }

  const isStep1Valid = background && budget && statePref && businessInMind;
  const isStep2Valid = selectedCategories.length > 0;
  const isStep4Valid = franchiseReferral !== null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] font-[DM_Sans]">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }} />

      <header className="fixed top-0 left-0 right-0 z-10 bg-[#0a0a0a] border-b border-[rgba(201,168,76,0.2)]">
        <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-4xl mx-auto">
          <span className="font-['Cormorant_Garamond'] text-xl font-normal text-[#f5f0e8]">e2go<span className="text-[#C9A84C]">.app</span></span>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[rgba(245,240,232,0.45)]">Step {step} of 6</div>
        </div>
      </header>

      <div className="fixed top-16 left-0 right-0 h-[3px] bg-[rgba(245,240,232,0.1)] z-10">
        <div className="h-full bg-[#C9A84C] transition-all duration-500" style={{ width: `${(step / 6) * 100}%` }} />
      </div>

      <main className="relative z-10 pt-24 pb-12 px-6 md:px-12 max-w-4xl mx-auto">
        {/* SCREEN 1: Background Questionnaire */}
        {step === 1 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 2 — Background</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-8">Your Professional Background</h1>

            <div className="space-y-8">
              <div>
                <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-4">
                  Which best describes your professional background?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BACKGROUND_OPTIONS.map((opt) => (
                    <button key={opt.id} onClick={() => setBackground(opt.id)} className={`text-left p-4 border transition-all ${background === opt.id ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]" : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"}`}>
                      <span className="text-[15px] font-medium text-[#f5f0e8]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-4">
                  What is your available investment budget?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button key={opt.id} onClick={() => setBudget(opt.id)} className={`text-left p-4 border transition-all ${budget === opt.id ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]" : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"}`}>
                      <span className="text-[15px] font-medium text-[#f5f0e8]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-4">
                  Do you have a preference for U.S. state or region?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {STATE_OPTIONS.map((opt) => (
                    <button key={opt.id} onClick={() => setStatePref(opt.id)} className={`text-left p-4 border transition-all ${statePref === opt.id ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]" : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"}`}>
                      <span className="text-[15px] font-medium text-[#f5f0e8]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-4">
                  Do you already have a business in mind?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BUSINESS_OPTIONS.map((opt) => (
                    <button key={opt.id} onClick={() => setBusinessInMind(opt.id)} className={`text-left p-4 border transition-all ${businessInMind === opt.id ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]" : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"}`}>
                      <span className="text-[15px] font-medium text-[#f5f0e8]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(businessInMind === "know_exactly" || businessInMind === "some_ideas") && (
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-2">
                    Describe your business in one sentence
                  </label>
                  <input
                    type="text"
                    value={specificBusinessDesc}
                    onChange={(e) => setSpecificBusinessDesc(e.target.value)}
                    className="w-full max-w-[480px] p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[15px] outline-none focus:border-[#C9A84C] transition-colors"
                    placeholder="e.g., A specialty coffee shop in Austin, Texas"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">Back</button>
              <button onClick={handleNext} disabled={!isStep1Valid || saving} className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all ${isStep1Valid && !saving ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]" : "bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed"}`}>
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: Business Category Cards */}
        {step === 2 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 2 — Categories</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-4">Select Up to 3 Categories</h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8">
              Based on your answers, these categories are strong candidates for E-2 approval. Select up to 3 to explore further.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                const canSelect = isSelected || selectedCategories.length < 3;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (isSelected) setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                      else if (canSelect) setSelectedCategories([...selectedCategories, cat.id]);
                    }}
                    disabled={!canSelect}
                    className={`text-left p-6 border transition-all ${
                      isSelected ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]" : canSelect ? "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]" : "border-[rgba(201,168,76,0.1)] opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[16px] font-medium text-[#f5f0e8]">{cat.name}</span>
                      <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold ${
                        cat.complexity === "green" ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" :
                        cat.complexity === "amber" ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20" :
                        "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"
                      }`}>
                        E-2 {cat.complexity === "green" ? "Straightforward" : cat.complexity === "amber" ? "Achievable with care" : "Complex"}
                      </span>
                    </div>
                    <div className="text-[13px] text-[#f5f0e8]/60 mb-3">{cat.description}</div>
                    <div className="flex gap-4 text-[12px] text-[#C9A84C]/80 uppercase tracking-wider">
                      <span>Min: {cat.minInvestment}</span>
                      <span>Emp: {cat.employees}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-8 pt-8 border-t border-[rgba(201,168,76,0.1)]">
              <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/40 mb-4">Incompatible with E-2</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {INCOMPATIBLE_BUSINESSES.map((biz) => (
                  <div key={biz.id} className="p-4 border border-[rgba(245,240,232,0.1)] bg-[rgba(255,255,255,0.02)] opacity-50">
                    <div className="text-[14px] font-medium text-[#f5f0e8]/50 mb-2 line-through">{biz.name}</div>
                    <div className="text-[12px] text-[#f5f0e8]/40">{biz.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">Back</button>
              <button onClick={handleNext} disabled={!isStep2Valid || saving} className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all ${isStep2Valid && !saving ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]" : "bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed"}`}>
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 3: Business Shortlist */}
        {step === 3 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 2 — Shortlist</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-4">Your Business Shortlist</h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8">
              Here are specific business examples matching your selected categories. Save up to 3 to your shortlist.
            </p>

            <div className="space-y-6 mb-8">
              {selectedCategories.map((catId) => {
                const examples = BUSINESS_EXAMPLES[catId] || [];
                const cat = CATEGORIES.find(c => c.id === catId);
                if (examples.length === 0) return null;
                return (
                  <div key={catId}>
                    <h3 className="text-[14px] font-medium uppercase tracking-[0.12em] text-[#C9A84C] mb-3">{cat?.name} Examples</h3>
                    <div className="space-y-3">
                      {examples.map((ex) => {
                        const isSaved = shortlist.includes(ex.name);
                        return (
                          <div key={ex.name} className={`p-4 border transition-all ${isSaved ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]" : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[15px] font-medium text-[#f5f0e8]">{ex.name}</span>
                              <button
                                onClick={() => {
                                  if (isSaved) setShortlist(shortlist.filter(n => n !== ex.name));
                                  else if (shortlist.length < 3) setShortlist([...shortlist, ex.name]);
                                }}
                                disabled={!isSaved && shortlist.length >= 3}
                                className={`px-3 py-1 text-[11px] uppercase tracking-wider font-medium transition-colors ${
                                  isSaved ? "bg-[#C9A84C] text-[#0a0a0a]" : "border border-[#C9A84C] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)]"
                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                              >
                                {isSaved ? "Saved" : "Save"}
                              </button>
                            </div>
                            <div className="flex gap-4 text-[12px] text-[#f5f0e8]/50 mb-1">
                              <span>Investment: {ex.investment}</span>
                              <span>Employees: {ex.employees}</span>
                              <span>{ex.franchise ? "Franchise available" : "Independent only"}</span>
                            </div>
                            <div className="text-[12px] text-[#22c55e]/80 uppercase tracking-wider">Match Score: {ex.matchScore}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">Back</button>
              <button onClick={handleNext} disabled={saving} className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all ${!saving ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]" : "bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed"}`}>
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 4: Franchise Referral Trigger */}
        {step === 4 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 2 — Referral</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-4">Franchise Consultant Connection</h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              Would you like us to connect you with a franchise consultant who specialises in E-2 compatible businesses? They will already know your budget and category preferences — no cold calls.
            </p>

            {module1ReferralConsent?.franchise ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => setFranchiseReferral(true)}
                  className={`text-left p-6 border transition-all ${franchiseReferral === true ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]" : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"}`}
                >
                  <div className="text-[16px] font-medium text-[#f5f0e8] mb-2">Yes, connect me</div>
                  <div className="text-[13px] text-[#f5f0e8]/50">We will introduce you to a vetted specialist.</div>
                </button>
                <button
                  onClick={() => setFranchiseReferral(false)}
                  className={`text-left p-6 border transition-all ${franchiseReferral === false ? "border-[#C9A84C] bg-[rgba(201,168,76,0.06)]" : "border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]"}`}
                >
                  <div className="text-[16px] font-medium text-[#f5f0e8] mb-2">No thanks, I&apos;ll find my own</div>
                  <div className="text-[13px] text-[#f5f0e8]/50">I prefer to research franchises independently.</div>
                </button>
              </div>
            ) : (
              <div className="mb-8">
                <p className="text-[14px] text-[#C9A84C] mb-4">You haven&apos;t opted into franchise referrals yet. Would you like to now?</p>
                <label className="flex items-start gap-4 cursor-pointer group mb-4">
                  <div className="relative mt-1">
                    <input type="checkbox" checked={franchiseReferral === true} onChange={(e) => setFranchiseReferral(e.target.checked)} className="peer sr-only" />
                    <div className="w-5 h-5 border border-[rgba(201,168,76,0.4)] bg-transparent peer-checked:bg-[#C9A84C] transition-colors" />
                    {franchiseReferral === true && (
                      <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-[#0a0a0a] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    )}
                  </div>
                  <span className="text-[14px] text-[#f5f0e8]/80 group-hover:text-[#f5f0e8] transition-colors pt-0.5">
                    Yes, connect me to a franchise consultant who specialises in E-2 businesses.
                  </span>
                </label>
                <button
                  onClick={() => setFranchiseReferral(false)}
                  className="text-[14px] text-[#f5f0e8]/50 hover:text-[#f5f0e8] underline transition-colors"
                >
                  No thanks, I&apos;ll find my own
                </button>
              </div>
            )}

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">Back</button>
              <button onClick={handleNext} disabled={!isStep4Valid || saving} className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all ${isStep4Valid && !saving ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]" : "bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed"}`}>
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 5: Experience Gap Detection */}
        {step === 5 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 2 — Experience Gap</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-4">Experience Alignment</h1>

            {gapAdvisory ? (
              <div className="border-l-[3px] border-[#f59e0b] bg-[rgba(245,158,11,0.04)] p-6 mb-8">
                <div className="text-[12px] uppercase tracking-widest text-[#f59e0b] mb-2 font-medium">Advisory Note</div>
                <p className="text-[15px] text-[#f5f0e8]/80 leading-relaxed">
                  {gapAdvisory} We will help you clearly demonstrate transferable management and operational skills in your qualifications document and business plan.
                </p>
              </div>
            ) : (
              <div className="border-l-[3px] border-[#22c55e] bg-[rgba(34,197,94,0.04)] p-6 mb-8">
                <div className="text-[12px] uppercase tracking-widest text-[#22c55e] mb-2 font-medium">Strong Alignment</div>
                <p className="text-[15px] text-[#f5f0e8]/80 leading-relaxed">
                  Your professional background aligns strongly with your selected business category. This will streamline the qualifications section of your application.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-12">
              <button onClick={handleBack} className="px-6 py-3 text-[#f5f0e8]/60 hover:text-[#f5f0e8] text-[14px] tracking-wide transition-colors">Back</button>
              <button onClick={handleNext} disabled={saving} className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all ${!saving ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]" : "bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed"}`}>
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 6: Module 2 Completion */}
        {step === 6 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Module 2 — Summary</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              Here is what we know about your business plan
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto mb-12">
              <div className="p-4 border border-[rgba(201,168,76,0.15)]">
                <div className="text-[11px] uppercase tracking-wider text-[#f5f0e8]/40 mb-1">Categories Explored</div>
                <div className="text-[15px] text-[#f5f0e8]">{selectedCategories.length} selected</div>
              </div>
              <div className="p-4 border border-[rgba(201,168,76,0.15)]">
                <div className="text-[11px] uppercase tracking-wider text-[#f5f0e8]/40 mb-1">Shortlist</div>
                <div className="text-[15px] text-[#f5f0e8]">{shortlist.length} businesses saved</div>
              </div>
              {specificBusinessDesc && (
                <div className="p-4 border border-[rgba(201,168,76,0.15)] md:col-span-2">
                  <div className="text-[11px] uppercase tracking-wider text-[#f5f0e8]/40 mb-1">Your Concept</div>
                  <span className="text-[15px] text-[#f5f0e8] italic">&ldquo;{specificBusinessDesc}&rdquo;</span>
                </div>
              )}
            </div>

            {saving ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-2 border-[rgba(201,168,76,0.2)] border-t-[#C9A84C] rounded-full animate-spin" />
                <span className="text-[13px] uppercase tracking-widest text-[#f5f0e8]/50">Finalizing and redirecting...</span>
              </div>
            ) : (
              <button onClick={handleNext} className="px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-[14px] font-medium uppercase tracking-[0.12em] hover:bg-[#D4BC6A] transition-colors w-full max-w-sm">
                Start your application profile →
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}