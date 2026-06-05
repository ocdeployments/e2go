"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { getPricingTier, TierId, QuizData } from "@/lib/pricing-tier";
import PricingCard from "@/components/PricingCard";

interface PricingTier {
  tier_id: string;
  name: string;
  amount: number;
  stripe_price_id: string;
  active: boolean;
}

const FOUNDING_MEMBER_LIMIT = 500;

const DEFAULT_TIERS: PricingTier[] = [
  { tier_id: 'solo_none', name: 'Solo Individual', amount: 29700, stripe_price_id: '', active: true },
  { tier_id: 'solo_spouse', name: 'Solo + Spouse', amount: 34700, stripe_price_id: '', active: true },
  { tier_id: 'solo_family_small', name: 'Solo + Family up to 2 kids', amount: 39700, stripe_price_id: '', active: true },
  { tier_id: 'solo_family_large', name: 'Solo + Family 3-5 kids', amount: 44700, stripe_price_id: '', active: true },
  { tier_id: 'partnership_none', name: 'Partnership', amount: 49700, stripe_price_id: '', active: true },
  { tier_id: 'partnership_couples', name: 'Partnership Two Couples', amount: 54700, stripe_price_id: '', active: true },
  { tier_id: 'partnership_families', name: 'Partnership Two Full Families', amount: 64700, stripe_price_id: '', active: true },
];

export default function PricingPage() {
  const router = useRouter();
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(DEFAULT_TIERS);
  const [foundingCount, setFoundingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<TierId | null>(null);
  const [hasQuizData, setHasQuizData] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [stripeNotConfigured, setStripeNotConfigured] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createBrowserSupabaseClient();

      // Fetch pricing tiers from DB
      const { data: tiers, error: tiersError } = await supabase
        .from('pricing')
        .select('tier_id, name, amount, stripe_price_id, active')
        .eq('active', true)
        .order('amount', { ascending: true });

      if (!tiersError && tiers && tiers.length > 0) {
        setPricingTiers(tiers);
      }

      // Get count of completed payments for founding member counter
      const { count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      setFoundingCount(count || 0);

      // Check if Stripe is configured
      const response = await fetch('/api/stripe/checkout', { method: 'HEAD' });
      if (response.status === 503) {
        setStripeNotConfigured(true);
      }

      // Check if we're in test mode
      setTestMode(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY?.startsWith('sk_test_') || false);

      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const initPricing = () => {
      const storedResultRaw = localStorage.getItem("e2go_quiz_result");
      if (storedResultRaw) {
        try {
          const parsed = JSON.parse(storedResultRaw);
          const quizAnswers = parsed.answers || {};

          const quizData: QuizData = {
            application_type: quizAnswers["Q0-09"] === "Two equal 50/50 owners" ? "partnership" : "solo",
            family_status: quizAnswers["Q0-16"] || "none",
          };

          const tier = getPricingTier(quizData);
          if (tier) {
            setSelectedTier(tier);
            setHasQuizData(true);
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    initPricing();
  }, []);

  useEffect(() => {
    if (highlightRef.current && selectedTier) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedTier]);

  const spotsRemaining = Math.max(0, FOUNDING_MEMBER_LIMIT - foundingCount);
  const foundingActive = foundingCount < FOUNDING_MEMBER_LIMIT;

  const handleSelect = async (id: string) => {
    setSelectedTier(id as TierId);
    setError(null);

    if (stripeNotConfigured) {
      setError('Payment processing is not configured. Please try again later.');
      return;
    }

    // Get current user
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Store selected tier and redirect to signup
      localStorage.setItem('e2go_selected_tier', id);
      router.push('/signup');
      return;
    }

    // Create or get application
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let applicationId = existingApp?.id;

    if (!applicationId) {
      // Create a new application record
      const { data: newApp, error: appError } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          application_type: id.startsWith('partnership') ? 'partnership' : 'solo',
          status: 'pending',
        })
        .select('id')
        .single();

      if (appError) {
        setError('Failed to create application. Please try again.');
        return;
      }
      applicationId = newApp.id;
    }

    // Initiate Stripe checkout
    setIsProcessingPayment(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: id,
          applicationId,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start payment');
      }
    } catch {
      setError('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              e2go<span style={{ color: "#f5f0e8" }}>.app</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
              Sign In
            </Link>
            <Link
              href="/quiz"
              className="text-sm font-medium px-4 py-2"
              style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm mb-6" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 0 }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C9A84C" }}>U.S. E-2 VISA SPECIALIST</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              Transparent Pricing for Your E-2 Journey
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(245,240,232,0.6)" }}>
              One-time fee, lifetime access to your complete consulate-formatted document package.
            </p>
            {!hasQuizData && (
              <p className="text-sm mt-4" style={{ color: "rgba(245,240,232,0.45)" }}>
                Take our <Link href="/quiz" className="underline" style={{ color: "#C9A84C" }}>eligibility quiz</Link> to see which plan applies to your situation.
              </p>
            )}
          </div>

          {/* Founding Member Counter */}
          {/* Test Mode Banner */}
          {testMode && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 0 }}>
                <span className="text-sm" style={{ color: "#3b82f6" }}>
                  Test mode — no real payments will be processed
                </span>
              </div>
            </div>
          )}

          {/* Founding Member Counter */}
          {!loading && foundingActive && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 0 }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#f59e0b" }}>
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span className="text-sm font-medium" style={{ color: "#f59e0b" }}>
                  {spotsRemaining} of {FOUNDING_MEMBER_LIMIT} founding spots remaining
                </span>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12" data-testid="pricing-tiers">
            {pricingTiers.map((tier) => {
              const tierFromDb = pricingTiers.find(t => t.tier_id === tier.tier_id);
              const tierName = tierFromDb?.name || tier.name;
              const tierAmount = tierFromDb?.amount || tier.amount;
              const isHighlighted = selectedTier === tier.tier_id;
              const isSolo = tier.tier_id.startsWith('solo');
              const description = isSolo
                ? 'Individual E-2 application with comprehensive document package'
                : 'Partnership E-2 application for treaty investor businesses';
              const features = isSolo
                ? ['DS-160 Form Preparation', 'Business Plan Draft', 'Investment Letter', 'Consulate Guide']
                : ['DS-160 for All Partners', 'Partnership Business Plan', 'Corporate Documents', 'Consulate Guide'];

              return (
                <div
                  key={tier.tier_id}
                  ref={isHighlighted ? highlightRef : undefined}
                  className={isHighlighted ? "md:col-span-2 lg:col-span-2" : ""}
                >
                  <PricingCard
                    id={tier.tier_id}
                    name={tierName}
                    price={tierAmount / 100}
                    description={description}
                    features={features}
                    isHighlighted={isHighlighted && hasQuizData}
                    isSelected={isHighlighted}
                    onSelect={handleSelect}
                  />
                </div>
              );
            })}
          </div>

          {/* Error Display */}
          {error && (
            <div className="max-w-md mx-auto mb-6 p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 0 }}>
              <p className="text-sm text-center" style={{ color: "#ef4444" }}>{error}</p>
            </div>
          )}

          {/* Loading/Processing Overlay */}
          {isProcessingPayment && (
            <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(10,10,10,0.8)" }}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[#f5f0e8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Redirecting to payment...</p>
              </div>
            </div>
          )}

          {/* Guarantee Section */}
          <div className="mb-12 max-w-3xl mx-auto" style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: "48px", height: "48px", minWidth: "48px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#22c55e" }}>
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                  Founding Member Guarantee
                </h3>
                <p className="text-sm mb-4" style={{ color: "rgba(245,240,232,0.6)" }}>
                  If you are not satisfied within 14 days of purchase, we will refund your payment
                  in full minus payment processing fees.
                </p>
                <div className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                  <p className="mb-2"><strong>To qualify:</strong> Request within 14 days of purchase, Module 1 started but no documents generated.</p>
                  <p>Email <a href="mailto:support@e2go.app" style={{ color: "#C9A84C", textDecoration: "underline" }}>support@e2go.app</a> — we respond within 2 business days. No forms. No arguments.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 max-w-2xl mx-auto" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                Secure payment via Stripe
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                256-bit encryption
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                100% money-back guarantee
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stats Section */}
      <section className="py-12 px-4" style={{ borderTop: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.01)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>54,364</p>
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>E-2 visas issued FY2024</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>90%</p>
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>Global approval rate FY2024</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>3–6 weeks</p>
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>Typical Toronto processing</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>$0</p>
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>Hidden fees</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4" style={{ background: "#0a0a0a", borderTop: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
            This tool is a self-service preparation guide and does not constitute legal advice.
            e2go.app is not a law firm and does not provide legal representation or immigration
            services. For legal advice, consult a qualified U.S. immigration consultant.
          </p>
        </div>
      </footer>
    </div>
  );
}
