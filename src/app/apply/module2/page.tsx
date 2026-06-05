"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

// Business categories from Vol 3 Section 6.9 - E-2 qualifying businesses
const BUSINESS_CATEGORIES = [
  { id: "senior_care", name: "Senior Care (Non-Medical)", description: "Companionship, personal care, homemaking services", tooltip: "No medical care. Standard business license in most states.", risk_level: "low" },
  { id: "home_health", name: "Home Health Care (Medical)", description: "Skilled nursing, physical therapy, medical care", tooltip: "HIGH licensing complexity. Requires Medicare/Medicaid certification. 6mo-2yr processing time in most states.", risk_level: "high" },
  { id: "childcare", name: "Childcare / Daycare", description: "Licensed childcare facility or after-school program", tooltip: "Director must hold U.S. credentials (CDA or ECE degree). Canadian credentials generally not accepted.", risk_level: "medium" },
  { id: "commercial_cleaning", name: "Commercial Cleaning", description: "Office, retail, medical facility cleaning services", tooltip: "No industry-specific license required in most states. Standard business license only.", risk_level: "low" },
  { id: "it_consulting", name: "IT Consulting / Software", description: "Technology consulting, software development, IT support", tooltip: "MUST have employees besides investor. Cannot be solo consultant. Must show management structure.", risk_level: "medium" },
  { id: "real_estate", name: "Real Estate Management", description: "Commercial or residential property management", tooltip: "Must manage properties for others (not your own). Property management company structure required.", risk_level: "low" },
  { id: "restaurant", name: "Restaurant / Food Service", description: "Restaurant, cafe, catering, food truck", tooltip: "Standard food service license required. Health department inspection required.", risk_level: "low" },
  { id: "retail", name: "Retail Store", description: "Storefront retail, e-commerce with warehouse", tooltip: "Standard business license. No special E-2 concerns unless selling regulated goods.", risk_level: "low" },
  { id: "professional_services", name: "Professional Services", description: "Consulting, legal support, accounting services", tooltip: "Must show employees and management structure. Solo practice does not qualify.", risk_level: "medium" },
  { id: "manufacturing", name: "Manufacturing", description: "Product manufacturing, assembly, production", tooltip: "Industrial zone may be required. Business plan must show production capacity and sales channels.", risk_level: "medium" },
  { id: "import_export", name: "Import / Export", description: "International trade, import/export brokerage", tooltip: "Must demonstrate genuine commercial activity beyond just moving goods between countries.", risk_level: "medium" },
  { id: "media", name: "Media / Entertainment", description: "Content creation, production, post-production", tooltip: "Equipment and studio space may be needed. Show tangible business infrastructure.", risk_level: "low" },
  { id: "education", name: "Education Services", description: "Tutoring, test prep, language school", tooltip: "Some states require education facility licenses. Curriculum must be substantive.", risk_level: "low" },
];

const BUSINESS_STAGES = [
  { id: "specific_franchise", label: "I have identified a specific franchise" },
  { id: "exploring", label: "I am exploring franchise options" },
  { id: "own_concept", label: "I have my own business concept" },
  { id: "researching", label: "I am still researching" },
];

const FDD_STATUS = [
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "Currently reviewing" },
  { id: "completed", label: "Reviewed - no concerns" },
  { id: "concerns", label: "Reviewed - have questions" },
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

const PREMISES_STATUS = [
  { id: "secured", label: "Lease secured", description: "I have a signed lease or purchase agreement" },
  { id: "negotiating", label: "Negotiating", description: "In active negotiations for a space" },
  { id: "identified", label: "Identified", description: "I have identified a specific location" },
  { id: "none", label: "Nothing yet", description: "No premises identified yet" },
];

interface Answer {
  question_key: string;
  answer_value: string;
}

export default function Module2Page() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessStage, setBusinessStage] = useState("");
  const [franchiseName, setFranchiseName] = useState("");
  const [fddStatus, setFddStatus] = useState("");
  const [targetState, setTargetState] = useState("");
  const [premisesStatus, setPremisesStatus] = useState("");

  // Load existing data on mount
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login?next=/apply/module2");
        return;
      }

      // Check if module 1 is complete
      const { data: lifecycle } = await supabase
        .from("application_lifecycle")
        .select("module1_completed_at, module2_started_at")
        .eq("user_id", user.id)
        .single();

      if (!lifecycle?.module1_completed_at) {
        router.push("/apply/onboarding");
        return;
      }

      // If module 2 already started, load existing answers
      if (lifecycle?.module2_started_at) {
        const { data: answers } = await supabase
          .from("answers")
          .select("question_key, answer_value")
          .eq("user_id", user.id)
          .like("question_key", "M2-%");

        if (answers) {
          answers.forEach((a: Answer) => {
            if (a.question_key === "M2-business_category") setBusinessCategory(a.answer_value);
            if (a.question_key === "M2-business_stage") setBusinessStage(a.answer_value);
            if (a.question_key === "M2-franchise_name") setFranchiseName(a.answer_value);
            if (a.question_key === "M2-fdd_status") setFddStatus(a.answer_value);
            if (a.question_key === "M2-target_state") setTargetState(a.answer_value);
            if (a.question_key === "M2-premises_status") setPremisesStatus(a.answer_value);
          });
        }
      } else {
        // Mark module 2 as started
        await supabase
          .from("application_lifecycle")
          .update({ module2_started_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }

      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const saveAnswer = async (questionKey: string, value: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("answers")
      .upsert({
        user_id: user.id,
        question_key: questionKey,
        answer_value: value,
        answered_at: new Date().toISOString(),
      }, { onConflict: "user_id,question_key" });
  };

  const handleNext = async () => {
    if (step === 6) {
      // Final step - save and redirect
      await saveAndComplete();
      router.push("/apply/module3");
      return;
    }

    setSaving(true);

    // Save current step's answer
    const stepData: { key: string; value: string } | null = 
      step === 1 ? { key: "M2-business_category", value: businessCategory } :
      step === 2 ? { key: "M2-business_stage", value: businessStage } :
      step === 3 && businessStage === "specific_franchise" ? { key: "M2-franchise_name", value: franchiseName } :
      step === 3 && businessStage === "specific_franchise" ? { key: "M2-fdd_status", value: fddStatus } :
      step === 4 ? { key: "M2-target_state", value: targetState } :
      step === 5 ? { key: "M2-premises_status", value: premisesStatus } : null;

    if (stepData && stepData.value) {
      await saveAnswer(stepData.key, stepData.value);
    }

    setSaving(false);
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      router.push("/dashboard");
      return;
    }
    setStep(step - 1);
  };

  const saveAndComplete = async () => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/apply/module2");
      return;
    }

    // Save all remaining answers
    await saveAnswer("M2-business_category", businessCategory);
    await saveAnswer("M2-business_stage", businessStage);
    if (businessStage === "specific_franchise") {
      await saveAnswer("M2-franchise_name", franchiseName);
      await saveAnswer("M2-fdd_status", fddStatus);
    }
    await saveAnswer("M2-target_state", targetState);
    await saveAnswer("M2-premises_status", premisesStatus);

    // Update lifecycle
    await supabase
      .from("application_lifecycle")
      .update({ module2_completed_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setSaving(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="text-[#004ac6]">Loading...</div>
      </div>
    );
  }

  const showFranchiseFields = businessStage === "specific_franchise";
  const selectedCategory = BUSINESS_CATEGORIES.find((c) => c.id === businessCategory);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <div className="text-sm text-[#737686]">Your Business — Step {step} of 6</div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="fixed top-16 left-0 right-0 h-1 bg-[#e2e8f0] z-40">
        <div className="h-full bg-[#004ac6] transition-all" style={{ width: `${(step / 6) * 100}%` }} />
      </div>

      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        {/* Step 1: Business Category */}
        {step === 1 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">Your Business — Select Category</h1>
            <p className="text-[#434655] mb-6">Choose the type of business you plan to operate in the U.S.</p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {BUSINESS_CATEGORIES.map((cat) => (
                <label key={cat.id} className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${businessCategory === cat.id ? "border-[#004ac6] bg-[#f8f9ff]" : "border-[#e2e8f0] hover:border-[#c3c6d7]"}`}>
                  <input type="radio" name="businessCategory" value={cat.id} checked={businessCategory === cat.id} onChange={(e) => setBusinessCategory(e.target.value)} className="sr-only" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#0b1c30]">{cat.name}</p>
                      {cat.risk_level === "high" && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">High</span>}
                      {cat.risk_level === "medium" && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">Medium</span>}
                    </div>
                    <p className="text-sm text-[#737686]">{cat.description}</p>
                    {cat.tooltip && <p className="text-xs text-[#004ac6] mt-1">{cat.tooltip}</p>}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${businessCategory === cat.id ? "border-[#004ac6]" : "border-[#c3c6d7]"}`}>
                    {businessCategory === cat.id && <div className="w-2.5 h-2.5 rounded-full bg-[#004ac6]" />}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={handleBack} className="px-6 py-3 text-[#434655] hover:text-[#004ac6]">Back</button>
              <button onClick={handleNext} disabled={!businessCategory || saving} className={`px-6 py-3 rounded-lg font-medium ${businessCategory && !saving ? "bg-[#004ac6] text-white hover:bg-[#003699]" : "bg-[#e2e8f0] text-[#737686] cursor-not-allowed"}`}>
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Business Stage */}
        {step === 2 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">What stage is your business in?</h1>
            <p className="text-[#434655] mb-6">This helps us tailor your interview preparation.</p>
            <div className="space-y-3">
              {BUSINESS_STAGES.map((stage) => (
                <label key={stage.id} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer ${businessStage === stage.id ? "border-[#004ac6] bg-[#f8f9ff]" : "border-[#e2e8f0] hover:border-[#c3c6d7]"}`}>
                  <input type="radio" name="businessStage" value={stage.id} checked={businessStage === stage.id} onChange={(e) => setBusinessStage(e.target.value)} className="sr-only" />
                  <div className="flex-1"><p className="font-medium text-[#0b1c30]">{stage.label}</p></div>
                  <div className={`w-5 h-5 rounded-full border-2 ${businessStage === stage.id ? "border-[#004ac6]" : "border-[#c3c6d7]"}`}>
                    {businessStage === stage.id && <div className="w-2.5 h-2.5 rounded-full bg-[#004ac6]" />}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={handleBack} className="px-6 py-3 text-[#434655] hover:text-[#004ac6]">Back</button>
              <button onClick={handleNext} disabled={!businessStage || saving} className={`px-6 py-3 rounded-lg font-medium ${businessStage && !saving ? "bg-[#004ac6] text-white hover:bg-[#003699]" : "bg-[#e2e8f0] text-[#737686]"}`}>{saving ? "Saving..." : "Continue →"}</button>
            </div>
          </section>
        )}

        {/* Step 3: Franchise Details */}
        {step === 3 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">{showFranchiseFields ? "Franchise Details" : "Franchise Exploration"}</h1>
            {showFranchiseFields ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0b1c30] mb-2">Franchise Brand Name</label>
                  <input type="text" value={franchiseName} onChange={(e) => setFranchiseName(e.target.value)} placeholder="e.g., Anytime Fitness, Dunkin'" className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] focus:border-[#004ac6] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0b1c30] mb-2">FDD Review Status</label>
                  <div className="space-y-2">
                    {FDD_STATUS.map((status) => (
                      <label key={status.id} className={`flex items-center p-3 rounded-lg border cursor-pointer ${fddStatus === status.id ? "border-[#004ac6] bg-[#f8f9ff]" : "border-[#e2e8f0]"}`}>
                        <input type="radio" name="fddStatus" value={status.id} checked={fddStatus === status.id} onChange={(e) => setFddStatus(e.target.value)} className="sr-only" />
                        <span className="text-[#0b1c30]">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#f8f9ff] rounded-lg p-4"><p className="text-[#434655]">When you&apos;re ready, review the Franchise Disclosure Document (FDD) which contains 23 items about costs, obligations, and performance.</p></div>
            )}
            <div className="flex justify-between mt-8">
              <button onClick={handleBack} className="px-6 py-3 text-[#434655]">Back</button>
              <button onClick={handleNext} disabled={showFranchiseFields ? !franchiseName || !fddStatus : saving} className={`px-6 py-3 rounded-lg ${showFranchiseFields && (!franchiseName || !fddStatus) ? "bg-[#e2e8f0]" : "bg-[#004ac6] text-white"}`}>{saving ? "Saving..." : "Continue →"}</button>
            </div>
          </section>
        )}

        {/* Step 4: Target State */}
        {step === 4 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">Target U.S. State</h1>
            <p className="text-[#434655] mb-6">Which state do you plan to operate in?</p>
            <div>
              <select value={targetState} onChange={(e) => setTargetState(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] focus:border-[#004ac6] outline-none bg-white">
                <option value="">Select a state...</option>
                {US_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
            {selectedCategory && targetState && (
              <div className="mt-6 p-4 bg-[#eff4ff] rounded-lg">
                <p className="text-sm text-[#434655]"><strong>Note for {selectedCategory.name} in {targetState}:</strong> {selectedCategory.tooltip}</p>
              </div>
            )}
            <div className="flex justify-between mt-8">
              <button onClick={handleBack} className="px-6 py-3 text-[#434655]">Back</button>
              <button onClick={handleNext} disabled={!targetState || saving} className={`px-6 py-3 rounded-lg ${targetState ? "bg-[#004ac6] text-white" : "bg-[#e2e8f0]"}`}>{saving ? "Saving..." : "Continue →"}</button>
            </div>
          </section>
        )}

        {/* Step 5: Premises Status */}
        {step === 5 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">Business Premises</h1>
            <p className="text-[#434655] mb-6">What is the status of your business location?</p>
            <div className="space-y-3">
              {PREMISES_STATUS.map((status) => (
                <label key={status.id} className={`flex items-start p-4 rounded-lg border-2 ${premisesStatus === status.id ? "border-[#004ac6] bg-[#f8f9ff]" : "border-[#e2e8f0]"}`}>
                  <input type="radio" name="premisesStatus" value={status.id} checked={premisesStatus === status.id} onChange={(e) => setPremisesStatus(e.target.value)} className="sr-only" />
                  <div className="flex-1">
                    <p className="font-medium text-[#0b1c30]">{status.label}</p>
                    <p className="text-sm text-[#737686]">{status.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={handleBack} className="px-6 py-3 text-[#434655]">Back</button>
              <button onClick={handleNext} disabled={!premisesStatus || saving} className={`px-6 py-3 rounded-lg ${premisesStatus ? "bg-[#004ac6] text-white" : "bg-[#e2e8f0]"}`}>{saving ? "Saving..." : "Continue →"}</button>
            </div>
          </section>
        )}

        {/* Step 6: Confirmation */}
        {step === 6 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">Confirm Your Business Details</h1>
            <p className="text-[#434655] mb-6">Review and click any field to edit.</p>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-[#e2e8f0] cursor-pointer hover:border-[#004ac6]" onClick={() => setStep(1)}>
                <p className="text-sm text-[#737686]">Business Category</p>
                <p className="font-medium text-[#0b1c30]">{selectedCategory?.name}</p>
              </div>
              <div className="p-4 rounded-lg border border-[#e2e8f0] cursor-pointer hover:border-[#004ac6]" onClick={() => setStep(2)}>
                <p className="text-sm text-[#737686]">Business Stage</p>
                <p className="font-medium text-[#0b1c30]">{BUSINESS_STAGES.find(s => s.id === businessStage)?.label}</p>
              </div>
              {showFranchiseFields && (
                <div className="p-4 rounded-lg border border-[#e2e8f0]" onClick={() => setStep(3)}>
                  <p className="text-sm text-[#737686]">Franchise</p>
                  <p className="font-medium text-[#0b1c30]">{franchiseName}</p>
                </div>
              )}
              <div className="p-4 rounded-lg border border-[#e2e8f0] cursor-pointer hover:border-[#004ac6]" onClick={() => setStep(4)}>
                <p className="text-sm text-[#737686]">Target State</p>
                <p className="font-medium text-[#0b1c30]">{targetState}</p>
              </div>
              <div className="p-4 rounded-lg border border-[#e2e8f0] cursor-pointer hover:border-[#004ac6]" onClick={() => setStep(5)}>
                <p className="text-sm text-[#737686]">Premises Status</p>
                <p className="font-medium text-[#0b1c30]">{PREMISES_STATUS.find(s => s.id === premisesStatus)?.label}</p>
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <Link href="/apply/overview" className="px-6 py-3 text-[#434655] hover:text-[#004ac6]">← Back to Overview</Link>
              <button onClick={handleNext} disabled={saving} className="px-6 py-3 bg-[#004ac6] text-white rounded-lg hover:bg-[#003699]">{saving ? "Saving..." : "Next: Application Profile →"}</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
