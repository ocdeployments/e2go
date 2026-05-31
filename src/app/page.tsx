"use client";

import Link from "next/link";
import Image from "next/image";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans">
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes flagFlutter {
          0%, 100% { transform: skewX(0deg) scaleX(1); }
          25% { transform: skewX(2deg) scaleX(1.02); }
          75% { transform: skewX(-2deg) scaleX(0.98); }
        }
        .flag-animation {
          animation: flagFlutter 8s ease-in-out infinite;
          transform-origin: left center;
        }
      `}</style>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
            </svg>
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="hidden md:block text-sm text-[#434655] hover:text-[#004ac6] transition-colors">
              Sign In
            </button>
            <Link
              href="/quiz"
              className="bg-[#004ac6] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#00337d] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#f8f9ff] pt-16">
        {/* Flag Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/flag.png"
            alt=""
            fill
            className="object-cover"
            style={{ opacity: 0.3, mixBlendMode: "multiply", transform: "scale(1.05)" }}
            priority
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0b1c30] mb-6 leading-tight">
            The E-2 investor visa, prepared properly.
          </h1>

          <p className="text-lg md:text-xl text-[#434655] mb-10 max-w-2xl mx-auto leading-relaxed">
            A structured guide built from official U.S. government sources. Know your
            eligibility, surface your risks, and get your complete document checklist
            — in under 15 minutes.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <span className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-sm text-[#434655] rounded-full shadow-sm border border-[#c3c6d7]">
              Based on USCIS & State Dept. guidance
            </span>
            <span className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-sm text-[#434655] rounded-full shadow-sm border border-[#c3c6d7]">
              Flags complex cases early
            </span>
            <span className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-sm text-[#434655] rounded-full shadow-sm border border-[#c3c6d7]">
              Used by 2,400+ Canadians
            </span>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/quiz"
              className="inline-flex items-center justify-center bg-[#004ac6] text-white text-lg font-medium px-8 py-4 rounded-lg hover:bg-[#00337d] transition-colors shadow-lg"
            >
              Check my eligibility
            </Link>
            <p className="text-sm text-[#737686]">
              Takes 10–15 minutes. No account required.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-semibold text-center text-[#0b1c30] mb-16">
            How it works
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="flex gap-4">
              <span className="text-4xl font-bold text-[#8ab4e8] shrink-0">01</span>
              <div>
                <h3 className="text-lg font-semibold text-[#0b1c30] mb-2">
                  Take the eligibility quiz
                </h3>
                <p className="text-[#434655] leading-relaxed">
                  25 focused questions, one at a time. The flow adapts to your answers.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-4xl font-bold text-[#8ab4e8] shrink-0">02</span>
              <div>
                <h3 className="text-lg font-semibold text-[#0b1c30] mb-2">
                  See your risk profile
                </h3>
                <p className="text-[#434655] leading-relaxed">
                  Complications are flagged in plain English before they become a denial.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-4xl font-bold text-[#8ab4e8] shrink-0">03</span>
              <div>
                <h3 className="text-lg font-semibold text-[#0b1c30] mb-2">
                  Receive your document checklist
                </h3>
                <p className="text-[#434655] leading-relaxed">
                  Every document your application needs, organized by category.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-4xl font-bold text-[#8ab4e8] shrink-0">04</span>
              <div>
                <h3 className="text-lg font-semibold text-[#0b1c30] mb-2">
                  Know your exact next step
                </h3>
                <p className="text-[#434655] leading-relaxed">
                  A complete readiness summary — or know exactly which type of attorney to contact.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-[#f8f9ff]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#004ac6] tracking-tight mb-2">
              Everything your application needs. Built in.
            </h2>
            <div className="h-1 w-12 bg-[#006a61] mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Document Interview Engine */}
            <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm transition-all hover:shadow-md">
              <div className="w-12 h-12 bg-[#e5eeff] flex items-center justify-center rounded-lg mb-4">
                <svg className="w-6 h-6 text-[#006a61]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#0b1c30] mb-2">Document Interview Engine</h3>
              <p className="text-sm text-[#434655]">11 tabs, ~250 guided questions. Every answer builds a document. Covers all Toronto consulate requirements.</p>
            </div>

            {/* Card 2: Business Plan Generator */}
            <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm transition-all hover:shadow-md">
              <div className="w-12 h-12 bg-[#e5eeff] flex items-center justify-center rounded-lg mb-4">
                <svg className="w-6 h-6 text-[#006a61]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#0b1c30] mb-2">Business Plan Generator</h3>
              <p className="text-sm text-[#434655]">AI-generated, consulate-formatted business plan built from your actual financial data. Not a template.</p>
            </div>

            {/* Card 3: Application Confidence Score */}
            <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm transition-all hover:shadow-md">
              <div className="w-12 h-12 bg-[#e5eeff] flex items-center justify-center rounded-lg mb-4">
                <svg className="w-6 h-6 text-[#006a61]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#0b1c30] mb-2">Application Confidence Score</h3>
              <p className="text-sm text-[#434655]">Your application scored across 8 dimensions before you submit. Every weakness flagged with a specific fix.</p>
            </div>

            {/* Card 4: Interview Simulator */}
            <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm transition-all hover:shadow-md">
              <div className="w-12 h-12 bg-[#e5eeff] flex items-center justify-center rounded-lg mb-4">
                <svg className="w-6 h-6 text-[#006a61]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#0b1c30] mb-2">Interview Simulator</h3>
              <p className="text-sm text-[#434655]">Practice with an AI officer who has read your application. Questions drawn from your specific case.</p>
            </div>

            {/* Card 5: PDF Package Generator */}
            <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm transition-all hover:shadow-md">
              <div className="w-12 h-12 bg-[#e5eeff] flex items-center justify-center rounded-lg mb-4">
                <svg className="w-6 h-6 text-[#006a61]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#0b1c30] mb-2">PDF Package Generator</h3>
              <p className="text-sm text-[#434655]">Complete, tab-organized binder formatted to Toronto consulate standards. 70-page limit enforced automatically.</p>
            </div>

            {/* Card 6: Document Checklist */}
            <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm transition-all hover:shadow-md">
              <div className="w-12 h-12 bg-[#e5eeff] flex items-center justify-center rounded-lg mb-4">
                <svg className="w-6 h-6 text-[#006a61]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#0b1c30] mb-2">Document Checklist</h3>
              <p className="text-sm text-[#434655]">Every document your application needs, annotated with exactly what it must show and where to obtain it.</p>
            </div>
          </div>

          {/* Also Included Section */}
          <div className="mt-12 pt-12 border-t border-[#e2e8f0]">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#737686]">Also included</h2>
              <div className="flex-grow h-px bg-[#e2e8f0]"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Perk 1: LLC Formation Guide */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]/50">
                <svg className="w-5 h-5 text-[#006a61] mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-[#0b1c30]">LLC Formation Guide</h4>
                  <p className="text-sm text-[#434655]">50-state formation walkthrough for your U.S. business entity.</p>
                </div>
              </div>

              {/* Perk 2: U.S. Banking Setup Guide */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]/50">
                <svg className="w-5 h-5 text-[#006a61] mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-[#0b1c30]">U.S. Banking Setup Guide</h4>
                  <p className="text-sm text-[#434655]">Step-by-step guide to opening a U.S. business account as a Canadian — including cross-border specialists.</p>
                </div>
              </div>

              {/* Perk 3: Canadian Departure Tax Planner */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]/50">
                <svg className="w-5 h-5 text-[#006a61] mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2"/>
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-[#0b1c30]">Canadian Departure Tax Planner</h4>
                  <p className="text-sm text-[#434655]">RRSP, departure returns, provincial health coverage timing, and non-resident tax implications.</p>
                </div>
              </div>

              {/* Perk 4: Compliance Calendar */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]/50">
                <svg className="w-5 h-5 text-[#006a61] mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-[#0b1c30]">Compliance Calendar</h4>
                  <p className="text-sm text-[#434655]">Auto-generated timeline of every deadline — visa renewal, tax filings, FBAR, employment milestones.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Line */}
          <div className="mt-12 text-center">
            <p className="text-sm text-[#737686] opacity-80">
              One-time fee · Lifetime access · No subscription
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-4 bg-[#eff4ff] border-y border-[#c3c6d7]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-[#004ac6] mb-1">3–6 weeks</p>
            <p className="text-sm text-[#434655]">Typical consulate processing time</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#004ac6] mb-1">$815 USD</p>
            <p className="text-sm text-[#434655]">U.S. government application fee (MRV)</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#004ac6] mb-1">2–5 years</p>
            <p className="text-sm text-[#434655]">Standard initial visa validity</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#004ac6] mb-1">Unlimited</p>
            <p className="text-sm text-[#434655]">Renewals if status is maintained</p>
          </div>
        </div>
      </section>

      {/* Sources Section */}
      <section className="py-20 px-4 bg-[#f8f9ff]">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e5eeff] rounded-full text-[#004ac6] text-sm mb-8">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Legal Framework</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-[#0b1c30] mb-4">
            Built from Official Sources
          </h2>
          <p className="text-lg text-[#434655] max-w-2xl mx-auto mb-12">
            Our platform is engineered to align perfectly with the regulatory standards of the United States visa adjudication process.
          </p>

          {/* 2x2 Grid of Source Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white border border-[#c3c6d7] p-4 md:p-6 flex flex-col items-start text-left transition-all hover:border-[#737686] hover:shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-[#e5eeff] mb-4">
                <svg className="w-6 h-6 text-[#004ac6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#004ac6] mb-1">9 FAM 402.9</span>
              <h3 className="text-sm font-bold text-[#0b1c30] mb-1 uppercase">U.S. Department of State</h3>
              <p className="text-xs text-[#434655] line-clamp-2">Foreign Affairs Manual — E Visa Guidance</p>
            </div>

            <div className="bg-white border border-[#c3c6d7] p-4 md:p-6 flex flex-col items-start text-left transition-all hover:border-[#737686] hover:shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-[#e5eeff] mb-4">
                <svg className="w-6 h-6 text-[#004ac6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#004ac6] mb-1">INA § 101(a)(15)(E)</span>
              <h3 className="text-sm font-bold text-[#0b1c30] mb-1 uppercase">U.S. Congress</h3>
              <p className="text-xs text-[#434655] line-clamp-2">Immigration and Nationality Act</p>
            </div>

            <div className="bg-white border border-[#c3c6d7] p-4 md:p-6 flex flex-col items-start text-left transition-all hover:border-[#737686] hover:shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-[#e5eeff] mb-4">
                <svg className="w-6 h-6 text-[#004ac6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#004ac6] mb-1">E-2 Policy Manual</span>
              <h3 className="text-sm font-bold text-[#0b1c30] mb-1 uppercase">USCIS</h3>
              <p className="text-xs text-[#434655] line-clamp-2">Adjudication Standards & Requirements</p>
            </div>

            <div className="bg-white border border-[#c3c6d7] p-4 md:p-6 flex flex-col items-start text-left transition-all hover:border-[#737686] hover:shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-[#e5eeff] mb-4">
                <svg className="w-6 h-6 text-[#004ac6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#004ac6] mb-1">DOS Treaty Table</span>
              <h3 className="text-sm font-bold text-[#0b1c30] mb-1 uppercase">U.S. Department of State</h3>
              <p className="text-xs text-[#434655] line-clamp-2">E Visa Treaty Country Listing</p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-12 pt-6 border-t border-[#c3c6d7]">
            <p className="text-xs text-[#737686] italic">
              e2go.app is not affiliated with USCIS, the U.S. Department of State, or any government agency.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0b1c30] text-center mb-12">
            Real Stories from Canadian Entrepreneurs
          </h2>

          <div className="flex flex-col gap-6">
            <div className="bg-[#f8f9ff] p-6 md:p-8 rounded-xl border border-[#c3c6d7] shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-[#004ac6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-xs font-semibold text-[#737686] uppercase tracking-wider">Verified User</span>
              </div>
              <blockquote className="text-lg text-[#0b1c30] mb-4">
                &ldquo;I&apos;d been putting this off for two years because the process felt impossible. e2go turned it into a weekend project. I finally understood exactly what I needed and why.&rdquo;
              </blockquote>
              <div className="text-sm">
                <span className="font-bold text-[#004ac6]">Michael T.</span>, Software company founder · Toronto, ON
              </div>
            </div>

            <div className="bg-[#f8f9ff] p-6 md:p-8 rounded-xl border border-[#c3c6d7] shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-[#004ac6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-xs font-semibold text-[#737686] uppercase tracking-wider">Verified User</span>
              </div>
              <blockquote className="text-lg text-[#0b1c30] mb-4">
                &ldquo;The quiz identified a gap in my fund documentation that would have sunk my application. Finding that before I filed — not at the consulate — was worth everything.&rdquo;
              </blockquote>
              <div className="text-sm">
                <span className="font-bold text-[#004ac6]">Sandra P.</span>, Restaurant group owner · Vancouver, BC
              </div>
            </div>

            <div className="bg-[#f8f9ff] p-6 md:p-8 rounded-xl border border-[#c3c6d7] shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-[#004ac6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-xs font-semibold text-[#737686] uppercase tracking-wider">Verified User</span>
              </div>
              <blockquote className="text-lg text-[#0b1c30] mb-4">
                &ldquo;My immigration attorney said my application package was one of the most organized they&apos;d seen. I used e2go to prepare every document. Not a single request for additional evidence.&rdquo;
              </blockquote>
              <div className="text-sm">
                <span className="font-bold text-[#004ac6]">David C.</span>, Manufacturing business owner · Calgary, AB
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Is this right for you? */}
      <section className="py-20 px-4 bg-[#f8f9ff]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-semibold text-center text-[#0b1c30] mb-10">
            Is this guide right for you?
          </h2>

          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-semibold text-[#0b1c30] mb-4">
                This guide is designed for:
              </h3>
              <ul className="space-y-3 text-[#434655]">
                <li className="flex items-start gap-2">
                  <span className="text-[#004ac6] mt-1">✓</span>
                  Canadian citizens with a concrete U.S. business opportunity
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#004ac6] mt-1">✓</span>
                  Entrepreneurs expanding an existing Canadian business into the U.S.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#004ac6] mt-1">✓</span>
                  Business owners who want to understand E-2 eligibility before engaging a lawyer
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#004ac6] mt-1">✓</span>
                  Applicants with a clear, documentable source of funds
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#004ac6] mt-1">✓</span>
                  People with a clean immigration and criminal history
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#0b1c30] mb-4">
                Speak with a lawyer first if:
              </h3>
              <ul className="space-y-3 text-[#434655]">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">!</span>
                  You have any criminal history in any country
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">!</span>
                  You have ever been denied a U.S. visa or refused entry
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">!</span>
                  Your investment funds are complex or hard to trace
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">!</span>
                  You have previously overstayed a U.S. visa
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">!</span>
                  Your business structure involves holding companies or passive investment
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 bg-[#004ac6] text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-4">
            Find out where you stand.
          </h2>
          <p className="text-lg text-white/80 mb-8">
            15 minutes. No account. No legal fees. A complete picture of your eligibility,
            your risks, and your next step.
          </p>
          <Link
            href="/quiz"
            className="inline-flex items-center justify-center bg-white text-[#004ac6] text-lg font-medium px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Start the eligibility quiz
          </Link>
          <p className="mt-4 text-sm text-white/70">
            No account required. Your answers stay on your device.
          </p>
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

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}