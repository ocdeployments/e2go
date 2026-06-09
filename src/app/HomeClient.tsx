"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import NavBar from "@/components/landing/NavBar";
import JourneyWizard from "@/components/landing/JourneyWizard";
import FeatureGrid from "@/components/landing/FeatureGrid";

type LandingContent = {
  heroHeadline: string | null;
  heroSubheadline: string | null;
  heroTrustBar: string | null;
  heroPrimaryCTA: string | null;
  heroSecondaryCTA: string | null;
  traditionalItems: readonly string[] | null;
  e2goItems: readonly string[] | null;
  featuresHeading: string | null;
  feature1Heading: string | null;
  feature1Body: string | null;
  feature2Heading: string | null;
  feature2Body: string | null;
  feature2Disclaimer: string | null;
  pricingHeading: string | null;
  pricingGuarantee: string | null;
  pricingSpotsRemaining: number | null;
  pricingFootnote: string | null;
  finalCtaHeading: string | null;
  finalCtaBody: string | null;
  finalCtaMicrocopy: string | null;
  finalCtaButton: string | null;
} | null;

const testimonials = [
  {
    quote:
      "I had spoken to two consultants and walked away more confused than when I started. e2go was the first thing that actually explained what the consulate needed to see and why.",
    author: "Marco T.",
    country: "Italy",
    type: "Franchise applicant",
  },
  {
    quote:
      "The source of funds section alone would have taken days with a consultant. The engine asked me the right questions and built the narrative from my answers.",
    author: "Aisha K.",
    country: "United Kingdom",
    type: "Solo applicant",
  },
  {
    quote:
      "I downloaded the package on a Friday. By Monday I had reviewed every document and sent it to my attorney. She said it was the cleanest first draft she had ever seen from a self-prepared applicant.",
    author: "David L.",
    country: "Canada",
    type: "Partnership applicant",
  },
];

export default function HomeClient({ content: _content }: { content?: LandingContent }) {
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stats animation trigger point
        }
      },
      { threshold: 0.5 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] overflow-x-hidden">
      {/* SECTION 1: NAVBAR */}
      <NavBar />

      {/* SECTION 2: HERO */}
      <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20">
        <div className="max-w-[860px]">
          {/* Eyebrow */}
          <p className="font-sans text-sm text-[rgba(245,240,232,0.45)] tracking-wider uppercase mb-4">
            E-2 Treaty Investor Visa · 82 Treaty Countries
          </p>

          {/* H1 Headline */}
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-light text-[#f5f0e8] leading-tight mb-6">
            Your U.S. business visa.
            <br />
            Without the{" "}
            <span className="italic text-[#C9A84C]">$12,000 legal bill</span>.
          </h1>

          {/* Sub-headline */}
          <p className="font-sans text-base md:text-lg text-[rgba(245,240,232,0.6)] max-w-[700px] mb-4">
            Most E-2 investors spend $150,000 on a business and $12,000 on a
            consultant. They spend $0 understanding what the embassy actually
            needs to see. That&apos;s the gap e2go closes.
          </p>

          {/* One line brighter */}
          <p className="font-sans text-base text-[rgba(245,240,232,0.7)] mb-8">
            What most people need first isn&apos;t a lawyer. It&apos;s clarity.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/quiz"
              className="font-sans text-base text-[#0a0a0a] bg-[#C9A84C] px-6 py-3 hover:bg-[#d4b85f] transition-colors duration-200 text-center"
            >
              Check my eligibility →
            </Link>
            <Link
              href="#how-it-works"
              className="font-sans text-base text-[#f5f0e8] px-6 py-3 border border-[rgba(201,168,76,0.3)] hover:border-[#C9A84C] transition-colors duration-200 text-center"
            >
              See how it works
            </Link>
          </div>

          {/* Stats Row */}
          <div
            ref={statsRef}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8"
          >
            {[
              { value: "82", label: "Treaty countries supported" },
              { value: "From $297", label: "vs. $12,000+ traditional route" },
              { value: "15", label: "Denial patterns tested against" },
              { value: "4–6 months", label: "To interview, not 12+" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center lg:text-left">
                <p className="font-display text-2xl md:text-3xl text-[#C9A84C]">
                  {stat.value}
                </p>
                <p className="font-sans text-xs md:text-sm text-[rgba(245,240,232,0.45)] mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: SOCIAL PROOF BAR */}
      <section className="border-y border-[rgba(201,168,76,0.1)] py-6">
        <p className="font-sans text-sm text-center text-[rgba(245,240,232,0.35)]">
          Trusted by E-2 applicants from Canada, the UK, Germany, Australia,
          Japan, and 77 other treaty countries.
        </p>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section id="how-it-works" className="px-4 md:px-8 lg:px-12 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Eyebrow */}
          <p className="font-sans text-sm text-[#C9A84C] tracking-wider uppercase mb-4 text-center">
            How it works
          </p>

          {/* Title */}
          <h2 className="font-display text-2xl md:text-4xl font-light text-[#f5f0e8] mb-4 text-center">
            Four steps to your consulate package.
          </h2>

          {/* Sub */}
          <p className="font-sans text-base text-[rgba(245,240,232,0.5)] text-center max-w-[600px] mx-auto mb-12">
            No consultants. No back-and-forth. Your complete application, built
            and tested in days.
          </p>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: "01",
                title: "Eligibility quiz",
                description:
                  "14 questions. 4 minutes. Instant verdict with a score out of 100, personalised risk flags, and your estimated timeline to interview.",
              },
              {
                num: "02",
                title: "Document interview",
                description:
                  "A guided conversation across 12 tabs that captures everything the consulate will ask about. Your answers become your documents.",
              },
              {
                num: "03",
                title: "AI document engine",
                description:
                  "Six documents generated in sequence. Tested against 15 denial patterns. Cross-checked for consistency. Written in your voice. AI detection run before every release.",
              },
              {
                num: "04",
                title: "Consulate package",
                description:
                  "A complete, formatted binder — every tab, every document, in the exact order your consulate expects. Download and go. Or hand to an attorney for a 2-hour review, not 20.",
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="border-l border-[rgba(201,168,76,0.12)] hover:border-l-[#C9A84C] pl-4 md:pl-6 transition-colors duration-200"
              >
                <p className="font-display text-4xl text-[rgba(201,168,76,0.25)] mb-4">
                  {step.num}
                </p>
                <h3 className="font-sans font-medium text-[#f5f0e8] text-lg mb-2">
                  {step.title}
                </h3>
                <p className="font-sans text-sm text-[rgba(245,240,232,0.5)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: JOURNEY WIZARD */}
      <section className="px-4 md:px-8 lg:px-12 py-16 md:py-24 bg-[rgba(201,168,76,0.02)]">
        <div className="max-w-5xl mx-auto">
          {/* Eyebrow */}
          <p className="font-sans text-sm text-[#C9A84C] tracking-wider uppercase mb-4 text-center">
            Your journey
          </p>

          {/* Title */}
          <h2 className="font-display text-2xl md:text-4xl font-light text-[#f5f0e8] mb-4 text-center">
            See how long your E-2 journey will actually take.
          </h2>

          {/* Sub */}
          <p className="font-sans text-base text-[rgba(245,240,232,0.5)] text-center max-w-[600px] mx-auto mb-12">
            Set your target date and where you are now. We show you both paths —
            and the gap between them.
          </p>

          {/* Journey Wizard */}
          <JourneyWizard />
        </div>
      </section>

      {/* SECTION 6: FEATURES GRID */}
      <section className="px-4 md:px-8 lg:px-12 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Eyebrow */}
          <p className="font-sans text-sm text-[#C9A84C] tracking-wider uppercase mb-4 text-center">
            What&apos;s included
          </p>

          {/* Title */}
          <h2 className="font-display text-2xl md:text-4xl font-light text-[#f5f0e8] mb-4 text-center">
            Everything a senior practitioner would prepare.
          </h2>

          {/* Sub */}
          <p className="font-sans text-base text-[rgba(245,240,232,0.5)] text-center max-w-[600px] mx-auto mb-12">
            Not a template. Not a form filler. A system that thinks about your
            case and builds a narrative that holds up under scrutiny.
          </p>

          {/* Feature Grid */}
          <FeatureGrid />
        </div>
      </section>

      {/* SECTION 7: FOUNDER'S NOTE */}
      <section className="px-4 md:px-8 lg:px-12 py-16 md:py-24">
        <div className="max-w-[560px] mx-auto text-center">
          <div className="w-10 h-px bg-[#C9A84C] mx-auto mb-8" />
          <p className="font-display text-lg md:text-xl font-light italic text-[rgba(245,240,232,0.65)] leading-relaxed">
            Before preparation, there is procrastination. Weeks become months.
            Months become a year. And the move you have been planning quietly
            stays a plan. You already have what you need. e2go gets you started
            — every document built, every gap closed, every question the
            consulate will ask already answered. All that&apos;s left is to make
            the jump.
          </p>
          <div className="w-10 h-px bg-[#C9A84C] mx-auto mt-8" />
        </div>
      </section>

      {/* SECTION 8: TESTIMONIALS */}
      <section className="px-4 md:px-8 lg:px-12 py-16 md:py-24 bg-[rgba(201,168,76,0.02)]">
        <div className="max-w-6xl mx-auto">
          {/* Eyebrow */}
          <p className="font-sans text-sm text-[#C9A84C] tracking-wider uppercase mb-4 text-center">
            From applicants
          </p>

          {/* Title */}
          <h2 className="font-display text-2xl md:text-4xl font-light text-[#f5f0e8] mb-12 text-center">
            What preparation actually feels like.
          </h2>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="border border-[rgba(201,168,76,0.12)] bg-[rgba(201,168,76,0.02)] p-6"
              >
                <p className="font-display text-lg italic text-[#f5f0e8] mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <p className="font-sans text-sm text-[#f5f0e8]">
                  — {testimonial.author} · {testimonial.country} ·{" "}
                  {testimonial.type}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9: FINAL CTA */}
      <section className="px-4 md:px-8 lg:px-12 py-16 md:py-24">
        <div className="max-w-[640px] mx-auto text-center">
          {/* Eyebrow */}
          <p className="font-sans text-sm text-[#C9A84C] tracking-wider uppercase mb-4">
            Ready to begin
          </p>

          {/* Title */}
          <h2 className="font-display text-2xl md:text-4xl font-light text-[#f5f0e8] mb-4">
            Find out if you qualify. It takes four minutes.
          </h2>

          {/* Sub */}
          <p className="font-sans text-base text-[rgba(245,240,232,0.5)] mb-8">
            No payment required for the eligibility check. No account required to
            start. 82 treaty countries. Every consulate. One platform.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/quiz"
              className="font-sans text-base text-[#0a0a0a] bg-[#C9A84C] px-6 py-3 hover:bg-[#d4b85f] transition-colors duration-200"
            >
              Check my eligibility →
            </Link>
            <Link
              href="/pricing"
              className="font-sans text-base text-[#f5f0e8] px-6 py-3 border border-[rgba(201,168,76,0.3)] hover:border-[#C9A84C] transition-colors duration-200"
            >
              View pricing
            </Link>
          </div>

          {/* Microcopy */}
          <p className="font-sans text-xs text-[rgba(245,240,232,0.25)]">
            Lawyer-ready documents. Lawyer-optional price.
          </p>
        </div>
      </section>

      {/* SECTION 10: FOOTER */}
      <footer className="border-t border-[rgba(201,168,76,0.1)] px-4 md:px-8 lg:px-12 py-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Logo + Copyright */}
          <div>
            <Link href="/" className="inline-block">
              <span className="font-display text-2xl font-light text-[#f5f0e8] tracking-wide">
                e2go
              </span>
            </Link>
            <p className="font-sans text-xs text-[rgba(245,240,232,0.35)] mt-4">
              © 2026 e2go.app. All rights reserved.
            </p>
          </div>

          {/* Center: Nav Links */}
          <div className="flex flex-wrap gap-6 md:justify-center">
            {[
              { href: "/#how-it-works", label: "How it works" },
              { href: "/pricing", label: "Pricing" },
              { href: "/quiz", label: "Quiz" },
              { href: "/learn", label: "Learn" },
              { href: "/support", label: "Support" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm text-[rgba(245,240,232,0.5)] hover:text-[#C9A84C] transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Legal */}
          <div className="md:text-right">
            <p className="font-sans text-xs text-[rgba(245,240,232,0.25)] leading-relaxed">
              This tool is a self-service preparation guide and does not
              constitute legal advice. e2go.app is not a law firm and does not
              provide legal representation or immigration services.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
