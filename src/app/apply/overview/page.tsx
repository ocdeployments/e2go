"use client";

import Link from "next/link";

const tabs = [
  {
    letter: "A",
    title: "DS-160 Reference",
    description: "Personal information for your visa application — name, passport, dates, and biographical details exactly as they appear on your passport.",
    status: "Required",
  },
  {
    letter: "B",
    title: "Personal Documents Checklist",
    description: "Every document you need to physically gather — passport copies, photos, birth certificates, and more — personalized to your situation.",
    status: "Required",
  },
  {
    letter: "C",
    title: "Visa Category",
    description: "Confirm your treaty country nationality and E-2 eligibility requirements specific to your country.",
    status: "Required",
  },
  {
    letter: "D",
    title: "Cover Letter",
    description: "Your personal narrative — who you are, why you are investing, and why you will return home when your status ends.",
    status: "Required",
  },
  {
    letter: "E",
    title: "Ownership Structure",
    description: "LLC formation documents, operating agreement, and ownership percentages — everything that proves you control your investment.",
    status: "Required",
  },
  {
    letter: "F",
    title: "Investment Proof",
    description: "Bank statements, wire confirmations, and evidence that your funds are legitimately sourced and truly at risk.",
    status: "Required",
  },
  {
    letter: "G",
    title: "Business Evidence",
    description: "Business licenses, leases, franchise agreements, and proof that your business is a real, operating enterprise.",
    status: "Required",
  },
  {
    letter: "H",
    title: "Source of Funds",
    description: "The complete paper trail — how you accumulated your investment capital, documented from start to finish.",
    status: "Required",
  },
  {
    letter: "I",
    title: "Non-Marginality",
    description: "Evidence that your business will generate more than just a living for you — job creation, economic impact, and financial projections.",
    status: "Required",
  },
  {
    letter: "J",
    title: "Qualifications",
    description: "Your experience, skills, and background — why you are the right person to make this investment succeed.",
    status: "Required",
  },
  {
    letter: "K",
    title: "Business Plan",
    description: "Five-year projections, market analysis, and operational details that convince the consulate your business will thrive.",
    status: "Required",
  },
  {
    letter: "L",
    title: "Dependents",
    description: "Spouse and children information, school enrollment letters, and documentation for any dependents traveling with you.",
    status: "If applicable",
  },
];

export default function OverviewPage() {
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
            <Link href="/dashboard" className="text-sm text-[#434655] hover:text-[#004ac6]">
              Dashboard
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
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">MODULE 3</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0b1c30] mb-4">
              Document Interview Engine
            </h1>
            <p className="text-lg text-[#434655] max-w-2xl mx-auto">
              12 tabs. Each one builds a piece of your application.
              Answer the questions — we build the documents.
            </p>
          </div>

          {/* Tabs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {tabs.map((tab) => (
              <div
                key={tab.letter}
                className="bg-white border border-[#e2e8f0] rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#004ac6] text-white rounded-lg flex items-center justify-center font-bold">
                    {tab.letter}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-[#0b1c30]">{tab.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        tab.status === "Required"
                          ? "bg-[#e5eeff] text-[#004ac6]"
                          : "bg-[#f3f4f6] text-[#434655]"
                      }`}>
                        {tab.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#434655]">{tab.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/apply/module3/a"
              className="inline-block bg-[#004ac6] text-white text-lg font-medium px-8 py-4 rounded-xl hover:bg-[#00337d] transition-colors shadow-lg hover:shadow-xl"
            >
              I&apos;m ready. Let&apos;s begin.
            </Link>
            <p className="mt-4 text-sm text-[#434655]">
              Takes 30–60 minutes to complete all 12 tabs
            </p>
          </div>
        </div>
      </main>

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