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
    <div className="min-h-screen bg-[#0a0a0a]">
      <main className="pt-8 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-8">
            <Link href="/dashboard" className="text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">Dashboard</Link>
            <span className="text-[rgba(245,240,232,0.45)]">/</span>
            <span className="text-[#C9A84C]">Application Overview</span>
          </div>

          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 border border-[rgba(201,168,76,0.2)]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C9A84C", fontFamily: "'DM Sans', sans-serif" }}>MODULE 3</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-medium mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              Document Interview Engine
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(245,240,232,0.65)" }}>
              12 tabs. Each one builds a piece of your application.
              Answer the questions — we build the documents.
            </p>
          </div>

          {/* Checklist Link */}
          <div className="mb-8 p-5 border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.02)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium mb-1" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif" }}>Need to gather documents first?</h3>
                <p className="text-sm" style={{ color: "rgba(245,240,232,0.65)" }}>View your personalized document checklist before starting the interview.</p>
              </div>
              <Link
                href="/apply/checklist"
                className="text-sm font-medium px-4 py-2 border border-[#C9A84C] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.06)] transition-colors"
                style={{ borderRadius: 0 }}
              >
                View Checklist →
              </Link>
            </div>
          </div>

          {/* Tabs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {tabs.map((tab) => (
              <Link
                key={tab.letter}
                href={`/apply/module3/${tab.letter.toLowerCase()}`}
                className="p-5 border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] hover:bg-[rgba(201,168,76,0.02)] transition-colors group"
                style={{ borderRadius: 0, textDecoration: "none" }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-medium border border-[#C9A84C] text-[#C9A84C] group-hover:bg-[#C9A84C] group-hover:text-[#0a0a0a] transition-colors" style={{ borderRadius: 0, fontFamily: "'Cormorant Garamond', serif" }}>
                    {tab.letter}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif" }}>{tab.title}</h3>
                      <span className="text-xs px-2 py-1 border" style={{
                        borderColor: tab.status === "Required" ? "#C9A84C" : "rgba(201,168,76,0.2)",
                        color: tab.status === "Required" ? "#C9A84C" : "rgba(245,240,232,0.65)",
                        borderRadius: 0,
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        {tab.status}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "rgba(245,240,232,0.65)" }}>{tab.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center flex flex-col items-center gap-4">
            <Link
              href="/apply/module3/a"
              className="text-lg font-medium px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A] transition-colors"
              style={{ borderRadius: 0 }}
            >
              I&apos;m ready. Let&apos;s begin.
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
              Takes 30–60 minutes to complete all 12 tabs
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}