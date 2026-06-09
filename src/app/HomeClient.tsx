"use client";
import { useState } from "react";
import Link from "next/link";

export default function HomeClient() {
  const [targetDate, setTargetDate] = useState("6");
  const [currentStage, setCurrentStage] = useState("business");
  const [applyingWith, setApplyingWith] = useState("family");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Timeline logic
  const e2goDuration = {
    exploring: "16–20 weeks",
    business: "12–16 weeks",
    llc: "8–12 weeks",
    documents: "4–8 weeks",
  }[currentStage] || "16–20 weeks";

  const tradDuration = {
    exploring: "9–14 months",
    business: "7–11 months",
    llc: "5–8 months",
    documents: "3–5 months",
  }[currentStage] || "9–14 months";

  const targetMonths = parseInt(targetDate);
  const targetWeeks = targetMonths * 4.3;
  const e2goMinWeeks = {
    exploring: 16, business: 12, llc: 8, documents: 4,
  }[currentStage] || 16;
  const tradMinWeeks = {
    exploring: 36, business: 28, llc: 20, documents: 12,
  }[currentStage] || 36;

  const isE2goAchievable = targetWeeks >= e2goMinWeeks;
  const isTradAchievable = targetWeeks >= tradMinWeeks;
  const weeksSaved = Math.max(0, Math.round(tradMinWeeks - e2goMinWeeks));
  const monthsSaved = Math.round(weeksSaved / 4.3);

  const stageOrder = ["exploring", "business", "llc", "documents"];
  const stageIdx = stageOrder.indexOf(currentStage);

  const tradSteps = [
    { text: "Research and orientation", week: "Wks 1–4", phase: 0 },
    { text: "Business search and FDD review", week: "Wks 4–20", phase: 1 },
    { text: "LLC, EIN, U.S. bank account", week: "Wks 16–24", phase: 1 },
    { text: "Find immigration consultant", week: "Wks 20–28", phase: 2 },
    { text: "Document gathering and drafting", week: "Wks 24–34", phase: 2 },
    { text: "Application submission", week: "Wks 34–40", phase: 3 },
    { text: "Consulate processing", week: "Wks 40–56+", phase: 3 },
  ];

  const e2goSteps = [
    { text: "Eligibility quiz and score", week: "Day 1", phase: 0 },
    { text: "Franchise broker introduction", week: "Wk 1", phase: 0 },
    { text: "Business selection and FDD review", week: "Wks 1–6", phase: 1 },
    { text: "LLC, EIN, U.S. bank account", week: "Wks 4–8", phase: 1 },
    { text: "Document interview — 12 tabs", week: "Wks 8–10", phase: 2 },
    { text: "AI document generation", week: "Wks 10–12", phase: 2 },
    { text: "Interview prep and simulator", week: "Wks 12–16", phase: 3 },
    { text: "Consulate interview", week: "Wks 16–20", phase: 3 },
  ];

  const faqs = [
    {
      q: "Is this a law firm?",
      a: "No. E2go prepares documents. What you do with your finished package is entirely up to you. If you choose to have an immigration consultant review it at this stage, it is a 2-hour job — not a 20-hour one.",
    },
    {
      q: "What if I am denied?",
      a: "We test every document against 15 real denial patterns before you ever see them. We cannot guarantee an outcome — no one can. But we can make sure your preparation is not the reason.",
    },
    {
      q: "How is this different from hiring a consultant?",
      a: "A consultant works on one case at a time, in their own way. E2go applies the same preparation discipline to every case, every time — tested against every denial pattern in our knowledge base and reviewed by you before a single document leaves the platform.",
    },
    {
      q: "Is my data secure?",
      a: "We never store your passports, bank statements, or financial records. Only your answers. Your documents are generated, reviewed by you, and downloaded. They belong to you entirely.",
    },
    {
      q: "What countries are eligible?",
      a: "The E-2 visa is available to citizens of 82 treaty countries. Our eligibility check confirms your specific country and consulate in the first question — it takes under a minute.",
    },
    {
      q: "How long does the whole process take?",
      a: "Your documents are typically ready within days of completing your application profile. The overall timeline — business formation, consulate appointment, visa processing — depends on your starting point. Our journey planner shows you a personalised timeline the moment you complete the eligibility check.",
    },
  ];

  return (
    <div className="bg-[#0a0a0a] text-[#f5f0e8] min-h-screen overflow-x-hidden">

      {/* HERO — with flag background */}
      <section className="relative overflow-hidden px-4 md:px-10 lg:px-16 pt-16 md:pt-24 pb-16 md:pb-20 max-w-5xl mx-auto w-full">
        {/* Flag SVG — behind content */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '75%',
          height: '100%',
          zIndex: 0,
          overflow: 'hidden'
        }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 660 520"
            preserveAspectRatio="xMinYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="flagFadeLeft" x1="0%" y1="0%"
                x2="100%" y2="0%">
                <stop offset="0%"
                  style={{stopColor:'#0a0a0a',stopOpacity:1}}/>
                <stop offset="25%"
                  style={{stopColor:'#0a0a0a',stopOpacity:0.7}}/>
                <stop offset="50%"
                  style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
              </linearGradient>
              <linearGradient id="flagFadeBottom" x1="0%" y1="0%"
                x2="0%" y2="100%">
                <stop offset="85%"
                  style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
                <stop offset="100%"
                  style={{stopColor:'#0a0a0a',stopOpacity:0.85}}/>
              </linearGradient>
            </defs>

            {/* 13 stripes */}
            {[0,80,160,240,320,400,480].map((y,i) => (
              <rect key={`r${i}`} width="660" height="40"
                y={y} fill="#BF0A30"/>
            ))}
            {[40,120,200,280,360,440].map((y,i) => (
              <rect key={`w${i}`} width="660" height="40"
                y={y} fill="#e6e6e6"/>
            ))}

            {/* Blue canton */}
            <rect width="264" height="280" y="0" fill="#002868"/>

            {/* Stars — 5-pointed polygons */}
            {[
              [18,14],[50,14],[82,14],[114,14],[146,14],
              [178,14],[210,14],[242,14],
              [34,40],[66,40],[98,40],[130,40],[162,40],
              [194,40],[226,40],
              [18,66],[50,66],[82,66],[114,66],[146,66],
              [178,66],[210,66],[242,66],
              [34,92],[66,92],[98,92],[130,92],[162,92],
              [194,92],[226,92],
              [18,118],[50,118],[82,118],[114,118],[146,118],
              [178,118],[210,118],[242,118],
              [34,144],[66,144],[98,144],[130,144],[162,144],
              [194,144],[226,144],
              [18,170],[50,170],[82,170],[114,170],[146,170],
              [178,170],[210,170],[242,170],
              [34,196],[66,196],[98,196],[130,196],[162,196],
              [194,196],[226,196],
              [18,222],[50,222],[82,222],[114,222],[146,222],
              [178,222],[210,222],[242,222],
              [34,248],[66,248],[98,248],[130,248],[162,248],
              [194,248],[226,248],
            ].map(([cx,cy],i) => {
              const r=9, ir=4;
              const pts = Array.from({length:5},(_,k)=>{
                const a = (k*72-90)*Math.PI/180;
                const b = (k*72-90+36)*Math.PI/180;
                return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)} ${cx+ir*Math.cos(b)},${cy+ir*Math.sin(b)}`;
              }).join(' ');
              return <polygon key={i} points={pts} fill="#FFFFFF"/>;
            })}

            {/* Fade overlays */}
            <rect width="660" height="520"
              fill="url(#flagFadeLeft)"/>
            <rect width="660" height="520"
              fill="url(#flagFadeBottom)"/>
          </svg>
        </div>

        {/* Content — above flag */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.65)] mb-5">
            E-2 Treaty Investor Visa · 82 Treaty Countries
          </p>
          <h1
            className="font-['Cormorant_Garamond'] text-4xl md:text-6xl lg:text-7xl font-light text-[#f5f0e8] leading-tight mb-6"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}
          >
            Your E-2 Investor Visa;<br />
            Without the <em className="text-[#C9A84C]">$12,000</em><br />
            price tag.
          </h1>
          <p
            className="text-base md:text-lg text-[rgba(245,240,232,0.5)] leading-relaxed max-w-xl mb-4"
            style={{ textShadow: '0 1px 10px rgba(0,0,0,0.95)' }}
          >
            Most E-2 investors spend $150,000 on a business and $12,000 on a
            consultant. They spend $0 understanding what the embassy actually
            needs to see. That is the gap E2go closes.
          </p>
          <p className="text-base text-[rgba(245,240,232,0.75)] mb-8 max-w-xl" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.95)' }}>
            &ldquo;Investors who get approved treat document preparation as the first step, not a final step.&rdquo;
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <Link href="/quiz" className="w-full sm:w-auto text-center px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-sm font-medium tracking-widest uppercase hover:opacity-85 transition-opacity">
              Check eligibility →
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto text-center px-8 py-4 border border-[rgba(201,168,76,0.3)] text-[rgba(245,240,232,0.65)] text-sm tracking-widest uppercase hover:border-[rgba(201,168,76,0.6)] transition-colors">
              See how it works
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-[rgba(201,168,76,0.1)] pt-8">
            {[
              { num: "82", label: "Treaty countries" },
              { num: "From $297", label: "vs. $12,000+ traditional" },
              { num: "15", label: "Denial patterns tested" },
              { num: "4–6 mo", label: "To interview, not 12+" },
            ].map((s, i) => (
              <div key={i} className="pr-4 md:pr-8 pb-4 md:pb-0 border-r border-[rgba(201,168,76,0.1)] last:border-r-0 mr-4 md:mr-8 last:mr-0">
                <div className="font-['Cormorant_Garamond'] text-2xl md:text-3xl font-light text-[#C9A84C]">{s.num}</div>
                <div className="text-xs text-[rgba(245,240,232,0.35)] mt-1 tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <div className="border-y border-[rgba(201,168,76,0.08)] py-4 px-4 md:px-10 text-center">
        <p className="text-xs text-[rgba(245,240,232,0.3)] tracking-wide">
          Trusted by E-2 applicants from Canada, the UK, Germany, Australia,
          Japan, and 77 other treaty countries.
        </p>
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="px-4 md:px-10 lg:px-16 py-16 md:py-24 bg-[rgba(201,168,76,0.02)] border-b border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">How it works</p>
        <h2 className="font-['Cormorant_Garamond'] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3">
          Four steps to your consulate package.
        </h2>
        <p className="text-sm text-[rgba(245,240,232,0.45)] mb-12 max-w-lg leading-relaxed">
          No consultants. No back-and-forth. Your complete application,
          built and tested in days.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          {[
            { n: "01", t: "Eligibility quiz", d: "14 questions. 4 minutes. Instant verdict with a score out of 100, personalised risk flags, and your estimated timeline to interview." },
            { n: "02", t: "E-2 Discovery ", d: "A guided conversation across 12 tabs that captures everything the consulate will ask about. Your answers become your documents." },
            { n: "03", t: "AI document engine", d: "Six documents generated in sequence. Tested against 15 denial patterns. Cross-checked for consistency. Written in your voice." },
            { n: "04", t: "Consulate package", d: "A complete formatted binder — every tab, every document, in the exact order your consulate expects. Download and go." },
          ].map((s, i) => (
            <div key={i} className="p-6 md:p-8 border border-[rgba(201,168,76,0.1)] -mt-px -ml-px hover:border-[rgba(201,168,76,0.3)] transition-colors">
              <div className="font-['Cormorant_Garamond'] text-4xl font-light text-[rgba(201,168,76,0.25)] mb-4">{s.n}</div>
              <div className="text-sm font-medium text-[#f5f0e8] mb-2">{s.t}</div>
              <div className="text-xs text-[rgba(245,240,232,0.45)] leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* JOURNEY WIZARD */}
      <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">Your journey</p>
        <h2 className="font-['Cormorant_Garamond'] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3">
          See how long your E-2 journey will take.
        </h2>
        <p className="text-sm text-[rgba(245,240,232,0.45)] mb-10 max-w-lg leading-relaxed">
          Set your target date and where you are now. We show you both
          paths — and the gap between them.
        </p>

        <div className="border border-[rgba(201,168,76,0.2)] p-6 md:p-10">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 overflow-x-auto whitespace-nowrap">
            {[
              { label: "Target move date", id: "target", val: targetDate, set: setTargetDate,
                opts: [["3","In 3 months"],["6","In 6 months"],["9","In 9 months"],["12","In 12 months"],["18","In 18 months"]] },
              { label: "Where you are now", id: "stage", val: currentStage, set: setCurrentStage,
                opts: [["exploring","Just exploring"],["business","Business identified"],["llc","LLC formed"],["documents","Documents started"]] },
              { label: "Applying with", id: "family", val: applyingWith, set: setApplyingWith,
                opts: [["solo","Just me"],["spouse","Me + spouse"],["family","Me + spouse + children"]] },
            ].map(c => (
              <div key={c.id}>
                <div className="text-[10px] tracking-[0.1em] uppercase text-[rgba(201,168,76,0.55)] mb-2">{c.label}</div>
                <select value={c.val} onChange={e => c.set(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[rgba(201,168,76,0.03)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-sm focus:border-[#C9A84C] outline-none appearance-none cursor-pointer">
                  {c.opts.map(([v, l]) => <option key={v} value={v} className="bg-[#1a1a1a]">{l}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Timeline columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Traditional */}
            <div className="border border-[rgba(245,245,245,0.06)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] tracking-[0.1em] uppercase text-[rgba(245,240,232,0.3)]">Traditional route</div>
                <div className="font-['Cormorant_Garamond'] text-xl font-light text-[rgba(245,240,232,0.35)]">{tradDuration}</div>
              </div>
              <div className="flex flex-col gap-2">
                {tradSteps.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-[rgba(245,240,232,0.2)] flex-shrink-0 mt-1.5"></div>
                    <div>
                      <span className={`text-xs text-[rgba(245,240,232,0.45)] leading-relaxed ${s.phase < stageIdx ? "line-through opacity-30" : ""}`}>
                        {s.text}
                      </span>
                      <span className="text-[10px] text-[rgba(245,240,232,0.2)] ml-2">{s.week}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* E2go */}
            <div className="border border-[rgba(201,168,76,0.25)] p-5 bg-[rgba(201,168,76,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] tracking-[0.1em] uppercase text-[#C9A84C]">E2go route</div>
                <div className="font-['Cormorant_Garamond'] text-xl font-light text-[#C9A84C]">{e2goDuration}</div>
              </div>
              <div className="flex flex-col gap-2">
                {e2goSteps.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0 mt-1.5"></div>
                    <div>
                      <span className={`text-xs text-[rgba(245,240,232,0.65)] leading-relaxed ${s.phase < stageIdx ? "line-through opacity-30" : ""}`}>
                        {s.text}
                      </span>
                      <span className="text-[10px] text-[rgba(201,168,76,0.5)] ml-2">{s.week}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gap indicator */}
          <div className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${!isE2goAchievable ? "border border-[rgba(220,60,60,0.3)] bg-[rgba(220,60,60,0.04)]" : "border border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.04)]"}`}>
            <p className={`text-sm leading-relaxed ${!isE2goAchievable ? "text-[rgba(220,60,60,0.85)]" : "text-[rgba(245,240,232,0.7)]"}`}>
              {!isE2goAchievable
                ? `Your ${targetMonths}-month target is tight. Start immediately — every week matters.`
                : !isTradAchievable
                ? `The traditional route cannot meet your ${targetMonths}-month target. E2go can — with ${monthsSaved > 0 ? `${monthsSaved} months to spare` : "time to spare"}.`
                : `E2go gets you to your interview approximately ${monthsSaved} months faster than the traditional route.`
              }
            </p>
            <Link href="/quiz" className="flex-shrink-0 px-5 min-h-[44px] py-3 bg-[#C9A84C] text-[#0a0a0a] text-xs font-medium tracking-widest uppercase hover:opacity-85 transition-opacity">
              Check my eligibility →
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24 bg-[rgba(201,168,76,0.02)] border-y border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">What is included</p>
        <h2 className="font-['Cormorant_Garamond'] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3">
          Everything a senior practitioner would prepare.
        </h2>
        <p className="text-sm text-[rgba(245,240,232,0.45)] mb-12 max-w-lg leading-relaxed">
          Not a template. Not a form filler. A system that thinks about
          your case and builds a narrative that holds up under scrutiny.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
          {[
            { t: "Case analysis engine", d: "6 calculations. 15 denial pattern checks. Investment substantiality, source of funds strength, marginality risk — all assessed before a word is written." },
            { t: "Sequential document generation", d: "Cover letter first. Each document reviewed before the next begins. Inconsistencies caught before they compound. You approve every document." },
            { t: "Writing style matching", d: "Your documents read like you wrote them. A writing sample calibrates the engine to your natural voice. AI detection run on every document." },
            { t: "Consulate intelligence", d: "Processing times, approval patterns, known preferences — specific to your consulate. Not generic advice." },
            { t: "Interview simulator", d: "The AI officer has read your package. Questions are generated from your specific application. Every weak point is probed." },
            { t: "Specialist referral network", d: "Franchise brokers, cross-border accountants, LLC formation specialists — connected at the right moment, briefed on your situation." },
          ].map((f, i) => (
            <div key={i} className="p-6 md:p-8 border border-[rgba(201,168,76,0.1)] -mt-px -ml-px hover:border-[rgba(201,168,76,0.3)] transition-colors group">
              <div className="text-[#C9A84C] text-2xl mb-3 group-hover:scale-110 transition-transform inline-block">◈</div>
              <div className="text-sm font-medium text-[#f5f0e8] mb-2">{f.t}</div>
              <div className="text-xs text-[rgba(245,240,232,0.45)] leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER NOTE */}
      <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24 pb-16 md:pb-24">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-10 h-px bg-[#C9A84C] mx-auto mb-8 opacity-60"></div>
          <p className="font-['Cormorant_Garamond'] text-xl md:text-2xl font-light italic text-[rgba(245,240,232,0.65)] leading-relaxed">
            Before preparation, there is procrastination.
            Weeks become months. Months become a year.
            And the move you have been planning quietly stays a plan.
            <br /><br />
            You already have what you need. E2go gets you started —
            every document built, every gap closed, every question
            the consulate will ask already answered.
            <br /><br />
            All that is left is to make the jump.
          </p>
          <div className="w-10 h-px bg-[#C9A84C] mx-auto mt-8 opacity-60"></div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24 bg-[rgba(201,168,76,0.02)] border-y border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">From applicants</p>
        <h2 className="font-['Cormorant_Garamond'] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-12">
          What preparation actually feels like.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {[
            { q: "I had spoken to two consultants and walked away more confused than when I started. E2go was the first thing that actually explained what the consulate needed to see and why.", a: "Marco T.", c: "Italy", t: "Franchise applicant" },
            { q: "The source of funds section alone would have taken days with a consultant. The engine asked me the right questions and built the narrative from my answers.", a: "Aisha K.", c: "United Kingdom", t: "Solo applicant" },
            { q: "I downloaded the package on a Friday. By Monday I had reviewed every document. My attorney said it was the cleanest first draft she had ever seen from a self-prepared applicant.", a: "David L.", c: "Canada", t: "Partnership applicant" },
          ].map((t, i) => (
            <div key={i} className="p-6 md:p-8 border border-[rgba(201,168,76,0.1)] -mt-px -ml-px">
              <p className="font-['Cormorant_Garamond'] text-base md:text-lg font-light italic text-[rgba(245,240,232,0.75)] leading-relaxed mb-5">&ldquo;{t.q}&rdquo;</p>
              <p className="text-xs text-[rgba(245,240,232,0.45)]">— {t.a}</p>
              <p className="text-[10px] text-[rgba(201,168,76,0.55)] tracking-widest uppercase mt-1">{t.c} · {t.t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24 border-t border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">Common questions</p>
        <h2 className="font-['Cormorant_Garamond'] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-12">
          Everything you need to know.
        </h2>
        <div className="max-w-2xl">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-[rgba(201,168,76,0.1)]">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left"
              >
                <span className="text-[15px] font-medium text-[#f5f0e8] pr-8">{faq.q}</span>
                <span className="text-[#C9A84C] text-xl flex-shrink-0 font-light">
                  {openFaq === i ? '−' : '+'}
                </span>
              </button>
              {openFaq === i && (
                <div className="pb-5 text-[13px] text-[rgba(245,240,232,0.55)] leading-relaxed max-w-xl">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 md:px-10 lg:px-16 py-20 md:py-32 text-center">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-4">Ready to begin</p>
        <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-6xl font-light text-[#f5f0e8] mb-4 leading-tight">
          Find out if you qualify.<br />It takes four minutes.
        </h2>
        <p className="text-sm text-[rgba(245,240,232,0.4)] mb-8 leading-relaxed">
          No payment required for the eligibility check. No account required to start.<br />
          82 treaty countries. Every consulate. One platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/quiz" className="w-full sm:w-auto text-center px-10 py-4 bg-[#C9A84C] text-[#0a0a0a] text-sm font-medium tracking-widest uppercase hover:opacity-85 transition-opacity">
            Check my eligibility →
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto text-center px-10 py-4 border border-[rgba(201,168,76,0.3)] text-[rgba(245,240,232,0.6)] text-sm tracking-widest uppercase hover:border-[rgba(201,168,76,0.6)] transition-colors">
            View pricing
          </Link>
        </div>
        <p className="text-xs text-[rgba(245,240,232,0.2)] tracking-wide">
          Lawyer-ready documents. Lawyer-optional price.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(201,168,76,0.08)] px-4 md:px-10 lg:px-16 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="font-['Cormorant_Garamond'] text-xl font-light text-[#C9A84C] mb-2">
              e2go<span className="text-[rgba(245,240,232,0.5)]">.app</span>
            </div>
            <p className="text-xs text-[rgba(245,240,232,0.25)] leading-relaxed">
              © 2026 E2go.app. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {["How it works", "Pricing", "Quiz", "Learn", "Support"].map(l => (
              <Link key={l} href={`/${l.toLowerCase().replace(/ /g, "-")}`}
                className="text-xs text-[rgba(245,240,232,0.35)] hover:text-[rgba(245,240,232,0.7)] transition-colors">
                {l}
              </Link>
            ))}
          </div>
          <div>
            <p className="text-[10px] text-[rgba(245,240,232,0.2)] leading-relaxed">
              This tool is a self-service preparation guide and does not
              constitute legal advice. e2go.app is not a law firm and does
              not provide legal representation or immigration services.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
