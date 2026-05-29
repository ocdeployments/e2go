"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface QuizSessionData {
  id: string;
  email: string | null;
  application_type: string | null;
  family_type: string | null;
  outcome: string;
}

const LEGAL_DISCLAIMER = "e2go.app is a preparation tool, not a law firm. Nothing on this platform constitutes legal advice. This platform does not provide legal advice, and no information on this site creates an attorney-client relationship. For legal advice about your specific situation, please consult a licensed U.S. immigration attorney.";

const APPLICATION_DOCUMENTS = {
  solo: ["Cover Letter", "DS-160 Reference", "Source of Funds", "Investment Proof", "Business Plan", "Qualifications"],
  partnership: ["Cover Letter", "DS-160 Reference", "Source of Funds", "Investment Proof", "Business Plan", "Qualifications", "Partnership Agreement"],
  individual: ["Cover Letter", "DS-160 Reference", "Source of Funds", "Investment Proof", "Business Plan", "Qualifications"],
  couple: ["Cover Letter", "DS-160 Reference", "Source of Funds", "Investment Proof", "Business Plan", "Qualifications", "Spouse Qualifications"],
  family: ["Cover Letter", "DS-160 Reference", "Source of Funds", "Investment Proof", "Business Plan", "Qualifications", "Spouse Qualifications", "Dependent Documentation"]
};

export default function OnboardingPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const resolvedParams = use(searchParams);
  const router = useRouter();
  const isDemo = resolvedParams?.demo === "true";

  const [step, setStep] = useState(1);
  const [quizSession, setQuizSession] = useState<QuizSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [applicationType, setApplicationType] = useState<string>("solo");
  const [familyType, setFamilyType] = useState<string>("individual");
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const init = async () => {
      let authUser = null;
      
      if (isDemo) {
        // Demo mode: create mock user
        const { data: { user: u } } = await supabase.auth.getUser();
        authUser = u;
        
        // Get latest quiz session
        const { data: quiz } = await supabase
          .from("quiz_sessions")
          .select("id, email, application_type, family_type, outcome")
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();
        
        setQuizSession(quiz);
        setApplicationType(quiz?.application_type || "solo");
        setFamilyType(quiz?.family_type || "individual");
      } else {
        const { data: { user: u } } = await supabase.auth.getUser();
        authUser = u;
        
        if (!authUser) {
          router.push("/login?next=/apply/onboarding");
          return;
        }
        
        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", authUser.id)
          .single();

        setName(profile?.full_name || "");
        
        // Get latest quiz session
        const { data: quiz } = await supabase
          .from("quiz_sessions")
          .select("id, email, application_type, family_type, outcome")
          .eq("user_id", authUser.id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();
        
        setQuizSession(quiz);
        setApplicationType(quiz?.application_type || "solo");
        setFamilyType(quiz?.family_type || "individual");
      }
      
      setLoading(false);
    };

    init();
  }, [isDemo, router]);

  const handleNext = async () => {
    if (step === 5) {
      // Final step - save and redirect
      await saveOnboardingData();
      router.push("/apply/module2");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      router.push("/dashboard");
      return;
    }
    setStep(step - 1);
  };

  const saveOnboardingData = async () => {
    setSaving(true);
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser && !isDemo) {
        router.push("/login?next=/apply/onboarding");
        return;
      }

      // Update quiz session if corrections were made
      if (quizSession) {
        await supabase
          .from("quiz_sessions")
          .update({
            application_type: applicationType,
            family_type: familyType,
          })
          .eq("id", quizSession.id);
      }

      // Update or create lifecycle record
      const userId = authUser?.id;
      
      if (userId) {
        const { data: existing } = await supabase
          .from("application_lifecycle")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existing) {
          await supabase
            .from("application_lifecycle")
            .update({
              module1_completed_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        } else {
          await supabase
            .from("application_lifecycle")
            .insert({
              user_id: userId,
              module1_started_at: new Date().toISOString(),
              module1_completed_at: new Date().toISOString(),
            });
        }
      }
    } catch (error) {
      console.error("Error saving onboarding:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="text-[#004ac6]">Loading...</div>
      </div>
    );
  }

  const docs = APPLICATION_DOCUMENTS[applicationType as keyof typeof APPLICATION_DOCUMENTS] || APPLICATION_DOCUMENTS.solo;

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
          <div className="text-sm text-[#737686]">Step {step} of 5</div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="fixed top-16 left-0 right-0 h-1 bg-[#e2e8f0] z-40">
        <div 
          className="h-full bg-[#004ac6] transition-all" 
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        {/* Step 1: Welcome + Name */}
        {step === 1 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">
              Welcome{name ? `, ${name}` : ""}! Let&apos;s build your application.
            </h1>
            <p className="text-[#434655] mb-6">
              This is Module 1: Onboarding. We&apos;ll confirm your application details and get your consent.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0b1c30] mb-2">
                  Your Name (as it will appear on your application)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6] outline-none"
                  placeholder="Enter your full legal name"
                />
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[#434655] hover:text-[#004ac6]"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-[#004ac6] text-white rounded-lg font-medium hover:bg-[#003699]"
              >
                Continue →
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Application Type */}
        {step === 2 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">
              Confirm your application type
            </h1>
            <p className="text-[#434655] mb-6">
              Is this a solo application or a partnership with another investor?
            </p>
            <div className="space-y-3">
              {["solo", "partnership"].map((type) => (
                <label
                  key={type}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    applicationType === type 
                      ? "border-[#004ac6] bg-[#f8f9ff]" 
                      : "border-[#e2e8f0] hover:border-[#c3c6d7]"
                  }`}
                >
                  <input
                    type="radio"
                    name="applicationType"
                    value={type}
                    checked={applicationType === type}
                    onChange={(e) => setApplicationType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-[#0b1c30] capitalize">{type}</p>
                    <p className="text-sm text-[#737686]">
                      {type === "solo" ? "One investor applying alone" : "Two or more investors applying together"}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    applicationType === type ? "border-[#004ac6]" : "border-[#c3c6d7]"
                  }`}>
                    {applicationType === type && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#004ac6]" />
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[#434655] hover:text-[#004ac6]"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-[#004ac6] text-white rounded-lg font-medium hover:bg-[#003699]"
              >
                Continue →
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Family Composition */}
        {step === 3 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">
              Who is included in your application?
            </h1>
            <p className="text-[#434655] mb-6">
              Select the family composition that matches your situation.
            </p>
            <div className="space-y-3">
              {[
                { value: "individual", label: "Individual", desc: "Just me - no spouse or dependents" },
                { value: "couple", label: "Couple", desc: "Me + spouse (no children)" },
                { value: "family", label: "Family", desc: "Me + spouse + dependent children" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    familyType === option.value 
                      ? "border-[#004ac6] bg-[#f8f9ff]" 
                      : "border-[#e2e8f0] hover:border-[#c3c6d7]"
                  }`}
                >
                  <input
                    type="radio"
                    name="familyType"
                    value={option.value}
                    checked={familyType === option.value}
                    onChange={(e) => setFamilyType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-[#0b1c30]">{option.label}</p>
                    <p className="text-sm text-[#737686]">{option.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    familyType === option.value ? "border-[#004ac6]" : "border-[#c3c6d7]"
                  }`}>
                    {familyType === option.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#004ac6]" />
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[#434655] hover:text-[#004ac6]"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-[#004ac6] text-white rounded-lg font-medium hover:bg-[#003699]"
              >
                Continue →
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Consent + Disclaimer */}
        {step === 4 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">
              Consent & Disclaimer
            </h1>
            <div className="bg-[#fff3cd] border border-[#ffc107] rounded-lg p-4 mb-6">
              <p className="text-sm text-[#856404]">{LEGAL_DISCLAIMER}</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-[#c3c6d7] text-[#004ac6] focus:ring-[#004ac6]"
              />
              <span className="text-[#434655]">
                I acknowledge that e2go.app is a preparation tool only and not a law firm. 
                I understand that I should consult with a licensed immigration attorney for legal advice.
              </span>
            </label>
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[#434655] hover:text-[#004ac6]"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!consentGiven}
                className={`px-6 py-3 rounded-lg font-medium ${
                  consentGiven 
                    ? "bg-[#004ac6] text-white hover:bg-[#003699]" 
                    : "bg-[#e2e8f0] text-[#737686] cursor-not-allowed"
                }`}
              >
                I Acknowledge & Continue
              </button>
            </div>
          </section>
        )}

        {/* Step 5: Ready to Build */}
        {step === 5 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">
              Your application is ready. Here&apos;s what we&apos;ll build together.
            </h1>
            <p className="text-[#434655] mb-6">
              Based on your {applicationType} application with {familyType} family composition,
              we&apos;ll generate these documents:
            </p>
            <ul className="space-y-3 mb-8">
              {docs.map((doc, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#d4edda] text-[#155724] flex items-center justify-center text-sm">
                    ✓
                  </div>
                  <span className="text-[#0b1c30]">{doc}</span>
                </li>
              ))}
            </ul>
            <div className="bg-[#f8f9ff] rounded-lg p-4 mb-6">
              <p className="text-sm text-[#737686]">
                <strong>Next:</strong> We&apos;ll move to Module 2 to select your business type and investment details.
              </p>
            </div>
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-[#434655] hover:text-[#004ac6]"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="px-6 py-3 bg-[#004ac6] text-white rounded-lg font-medium hover:bg-[#003699]"
              >
                {saving ? "Saving..." : "Start Module 2 →"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
