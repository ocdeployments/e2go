  "use client";

import Link from "next/link";

export default function PricingPage() {
  const handleSelect = () => {
    // TODO: Wire Stripe checkout
    alert("Coming soon! Stripe integration to be added.");
  };

  const tiers = [
    {
      name: "Solo Individual",
      price: 247,
      description: "Full case builder for single applicant",
      features: [
        "Full Case Builder",
        "Business Plan Generator",
        "6-Pillar Analysis",
        "PDF Package Export",
      ],
      recommended: true,
    },
    {
      name: "Solo Couple",
      price: 297,
      description: "Everything in Individual + spouse",
      features: [
        "Everything in Individual",
        "Spouse EAD application prep",
      ],
      recommended: false,
    },
    {
      name: "Solo Family",
      price: 347,
      description: "Everything in Couple + children",
      features: [
        "Everything in Couple",
        "Minor children dependency forms",
      ],
      recommended: false,
    },
    {
      name: "Solo Extended",
      price: 397,
      description: "Everything in Family + partner",
      features: [
        "Everything in Family",
        "Additional business partner inclusion",
      ],
      recommended: false,
    },
  ];

  const stats = [
    { value: "54,364", label: "E-2 visas issued FY2024" },
    { value: "90%", label: "Global approval rate FY2024" },
    { value: "3–6 weeks", label: "Typical Toronto processing" },
    { value: "$0", label: "Hidden fees" },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="hidden md:block text-sm text-[#434655] hover:text-[#004ac6]">
              Sign In
            </button>
            <Link
              href="/quiz"
              className="bg-[#004ac6] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#00337d]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e5eeff] rounded-full text-[#004ac6] text-sm mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">U.S. E-2 VISA SPECIALIST</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0b1c30] mb-4">
              Choose Your Solo Path
            </h1>
            <p className="text-lg text-[#434655] max-w-2xl mx-auto">
              Unlock your professional visa application package. One-time fee, lifetime access.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto mb-12">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative bg-white border rounded-xl p-6 transition-all hover:shadow-lg ${
                  tier.recommended ? "border-[#004ac6] border-2 shadow-lg" : "border-[#e2e8f0]"
                }`}
              >
                {tier.recommended && (
                  <div className="absolute -top-3 left-6 bg-[#004ac6] text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    RECOMMENDED CHOICE
                  </div>
                )}

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#0b1c30] mb-1">{tier.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${tier.recommended ? "text-[#004ac6]" : "text-[#0b1c30]"}`}>
                        ${tier.price}
                      </span>
                      <span className="text-sm text-[#737686]">USD</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <ul className="space-y-2 mb-4">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-[#434655]">
                          <svg className="w-4 h-4 text-[#004ac6]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleSelect}
                      className={`w-full font-medium py-3 rounded-lg transition-colors ${
                        tier.recommended
                          ? "bg-[#004ac6] text-white hover:bg-[#00337d]"
                          : "border border-[#004ac6] text-[#004ac6] hover:bg-[#e5eeff]"
                      }`}
                    >
                      {tier.recommended ? "Get Started" : `Select ${tier.name}`}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="pt-8 border-t border-[#e2e8f0] max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 opacity-80">
              <div className="flex items-center gap-2 text-sm text-[#434655]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                Secure payment via Stripe
              </div>
              <div className="flex items-center gap-2 text-sm text-[#434655]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                256-bit encryption
              </div>
              <div className="flex items-center gap-2 text-sm text-[#434655]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                100% money-back guarantee
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-white border-t border-[#e2e8f0]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-2xl md:text-3xl font-bold text-[#004ac6] mb-1">{stat.value}</p>
              <p className="text-sm text-[#434655]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-[#0b1c30]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-gray-400">
            This tool is a self-service preparation guide and does not constitute legal advice.
            e2go.app is not a law firm and does not provide legal representation or immigration
            services. For legal advice, consult a qualified U.S. immigration attorney.
          </p>
        </div>
      </footer>
    </div>
  );
}