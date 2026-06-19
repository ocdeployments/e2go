"use client";
import { useState } from "react";
import Link from "next/link";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import FaqWidgetHome from "@/components/landing/FaqWidgetHome";
import SectionNav from "@/components/landing/SectionNav";

export default function HomeClient() {
  const [menuOpen, setMenuOpen] = useState(false);

  const mistakes = [
    {
      n: "01",
      t: "Rushing to invest before confirming fit",
      d: "The costliest mistake in the E-2 process is committing capital to a business before confirming that the investment structure, the business model, and your qualifications will survive consular scrutiny. The right sequence is: assess first, invest second, document third. E2go is built around that sequence.",
    },
    {
      n: "02",
      t: "Getting legal help too early — or too late",
      d: "Too early means paying fees before you know whether your business structure is E-2 compliant. Too late means arriving at the consulate hoping for the best. The right moment is after the strategy is confirmed and before the application is filed. E2go handles the strategy. A consultant reviews and signs off.",
    },
    {
      n: "03",
      t: "Over-relying on free advice without context",
      d: "Facebook groups and Reddit threads cannot tell you whether your specific business, at your specific investment level, with your specific background, will survive scrutiny at your specific consulate. Context is everything. E2go's consulate intelligence covers 82 treaty country consulates and tracks adjudication patterns by post.",
    },
  ];

  return (
    <div className="bg-[#0a0a0a] text-[#f5f0e8] min-h-screen w-full overflow-x-hidden font-['DM_Sans',system-ui,sans-serif]">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[rgba(201,168,76,0.1)]">
        <div className="px-4 md:px-10 lg:px-16">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="font-['Cormorant_Garamond',Georgia,serif] text-xl md:text-2xl font-light text-[#C9A84C]">
              E2go<span className="text-[rgba(245,240,232,0.8)]">.app</span>
            </Link>
            <div className="hidden md:flex items-center gap-7">
              {[["/#how-it-works","How it works"],["/learn","Learn"],["/pricing","Pricing"],["/simulator","Simulator"]].map(([href,label]) => (
                <Link key={label} href={href} className="text-sm text-[rgba(245,240,232,0.55)] hover:text-[#f5f0e8] transition-colors tracking-wide">{label}</Link>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm text-[rgba(245,240,232,0.4)] hover:text-[rgba(245,240,232,0.7)] transition-colors px-3 py-2 min-h-[44px] flex items-center">Log in</Link>
              <Link href="/quiz" className="px-5 py-2.5 border border-[rgba(201,168,76,0.45)] text-[#C9A84C] text-xs tracking-widest uppercase hover:border-[#C9A84C] transition-colors min-h-[44px] flex items-center">Check eligibility</Link>
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-[rgba(245,240,232,0.6)] min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1"
              aria-label="Toggle menu"
            >
              <span className="w-5 h-px bg-current block"></span>
              <span className="w-5 h-px bg-current block"></span>
              <span className="w-5 h-px bg-current block"></span>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-[rgba(201,168,76,0.1)] px-4 py-4 flex flex-col gap-1">
            {[["/#how-it-works","How it works"],["/learn","Learn"],["/pricing","Pricing"],["/simulator","Simulator"],["/login","Log in"]].map(([href,label]) => (
              <Link key={label} href={href} onClick={() => setMenuOpen(false)}
                className="text-sm text-[rgba(245,240,232,0.65)] py-3 border-b border-[rgba(201,168,76,0.08)] min-h-[44px] flex items-center">{label}</Link>
            ))}
            <Link href="/quiz" onClick={() => setMenuOpen(false)}
              className="mt-3 w-full text-center px-5 py-3 bg-[#C9A84C] text-[#0a0a0a] text-xs font-medium tracking-widest uppercase min-h-[44px] flex items-center justify-center">
              Check eligibility →
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-4 md:px-10 lg:px-16 pt-14 md:pt-20 pb-14 md:pb-20">
        {/* Flag SVG */}
        <div style={{ position:'absolute', top:0, right:0, width:'75%', height:'100%', zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
          <svg width="100%" height="100%" viewBox="0 0 660 520" preserveAspectRatio="xMinYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="flagFadeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor:'#0a0a0a',stopOpacity:1}}/>
                <stop offset="25%" style={{stopColor:'#0a0a0a',stopOpacity:0.7}}/>
                <stop offset="50%" style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
              </linearGradient>
              <linearGradient id="flagFadeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="85%" style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
                <stop offset="100%" style={{stopColor:'#0a0a0a',stopOpacity:0.85}}/>
              </linearGradient>
            </defs>
            {[0,80,160,240,320,400,480].map((y,i) => <rect key={`r${i}`} width="660" height="40" y={y} fill="#BF0A30"/>)}
            {[40,120,200,280,360,440].map((y,i) => <rect key={`w${i}`} width="660" height="40" y={y} fill="#e6e6e6"/>)}
            <rect width="264" height="280" y="0" fill="#002868"/>
            {[
              [18,14],[50,14],[82,14],[114,14],[146,14],[178,14],[210,14],[242,14],
              [34,40],[66,40],[98,40],[130,40],[162,40],[194,40],[226,40],
              [18,66],[50,66],[82,66],[114,66],[146,66],[178,66],[210,66],[242,66],
              [34,92],[66,92],[98,92],[130,92],[162,92],[194,92],[226,92],
              [18,118],[50,118],[82,118],[114,118],[146,118],[178,118],[210,118],[242,118],
              [34,144],[66,144],[98,144],[130,144],[162,144],[194,144],[226,144],
              [18,170],[50,170],[82,170],[114,170],[146,170],[178,170],[210,170],[242,170],
              [34,196],[66,196],[98,196],[130,196],[162,196],[194,196],[226,196],
              [18,222],[50,222],[82,222],[114,222],[146,222],[178,222],[210,222],[242,222],
              [34,248],[66,248],[98,248],[130,248],[162,248],[194,248],[226,248],
            ].map(([cx,cy],i) => {
              const r=9,ir=4;
              const pts=Array.from({length:5},(_,k)=>{
                const a=(k*72-90)*Math.PI/180;
                const b=(k*72-90+36)*Math.PI/180;
                return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)} ${cx+ir*Math.cos(b)},${cy+ir*Math.sin(b)}`;
              }).join(' ');
              return <polygon key={i} points={pts} fill="#FFFFFF"/>;
            })}
            <rect width="660" height="520" fill="url(#flagFadeLeft)"/>
            <rect width="660" height="520" fill="url(#flagFadeBottom)"/>
          </svg>
        </div>
        {/* Hero content — two columns on desktop: copy + CTAs (left), living Ask
            panel (right, over the flag). On mobile it stacks: headline → panel →
            CTAs → stats, so the free widget is the first interactive moment. */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] lg:grid-rows-[auto_auto] gap-y-10 lg:gap-x-12 lg:items-start">
          {/* Headline block */}
          <div className="lg:col-start-1 lg:row-start-1">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.65)] mb-4 md:mb-5">
              E-2 Treaty Investor Visa
            </p>
            <h1
              className="font-['Cormorant_Garamond',Georgia,serif] text-4xl md:text-5xl lg:text-[52px] font-light text-[#f5f0e8] leading-[1.08] mb-5 md:mb-6 max-w-2xl"
              style={{textShadow:'0 2px 20px rgba(0,0,0,0.9)'}}
            >
              Your E-2 Investor Business Plan &amp; Full Application Package—Without the{" "}
              <em className="text-[#C9A84C]">$12,000</em> price tag.
            </h1>
            <p className="text-sm md:text-base text-[rgba(245,240,232,0.5)] leading-relaxed max-w-xl mb-3"
              style={{textShadow:'0 1px 10px rgba(0,0,0,0.95)'}}>
              Consultants give you Zoom calls. Lawyers give you invoices. E2go gets you
              visa-ready — from eligibility check to a complete, consulate-ready
              application package. One platform. No middlemen. A fraction of the cost.
            </p>
            <p className="text-sm md:text-base text-[rgba(245,240,232,0.78)] max-w-xl italic font-['Cormorant_Garamond',Georgia,serif]"
              style={{textShadow:'0 1px 10px rgba(0,0,0,0.95)'}}>
              &ldquo;Investors who get approved treat documentation as a strategy not as a checklist.&rdquo;
            </p>
          </div>

          {/* Living Ask panel — pinned into the hero's top-right corner over the
              flag; width-capped so it reads as a deliberate card, not a slab.
              Stacks full-width first on mobile (first interactive moment). */}
          <div className="w-full lg:col-start-2 lg:row-start-1 lg:self-start lg:justify-self-end lg:max-w-[440px]">
            <FaqWidgetHome />
          </div>

          {/* CTAs + stats */}
          <div className="lg:col-start-1 lg:row-start-2">
            <div className="flex flex-col sm:flex-row gap-3 mb-10 md:mb-12">
              <Link href="/quiz" className="w-full sm:w-auto text-center px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-xs font-medium uppercase hover:opacity-85 transition-opacity min-h-[44px] flex items-center justify-center" style={{ letterSpacing: '0.13em', boxShadow: 'inset 0 1px 0 rgba(255,248,220,0.25)' }}>
                Check my eligibility →
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto text-center px-8 py-4 border border-[rgba(245,240,232,0.35)] text-[rgba(245,240,232,0.7)] text-xs tracking-widest uppercase hover:border-[rgba(245,240,232,0.6)] hover:text-[rgba(245,240,232,0.95)] transition-colors min-h-[44px] flex items-center justify-center">
                See how it works
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 pt-6 md:pt-8">
              <div className="col-span-2 md:col-span-4 flex items-center gap-4 mb-6 md:mb-8">
                <div className="w-12 h-px bg-[#C9A84C]" />
                <div className="w-1 h-1 bg-[#C9A84C]" />
              </div>
              {[
                { num: "Free", label: "Eligibility check + ask anything — no account" },
                { num: "6", label: "Consulate-ready documents, written in your voice" },
                { num: "15", label: "Denial-risk checks on every draft before you see it" },
                { num: "From $550", label: "A complete package — not the $12,000 route" },
              ].map((s,i) => (
                <div key={i} className="pr-4">
                  <div className={`font-['Cormorant_Garamond',Georgia,serif] font-light text-[#C9A84C] ${s.num.length > 4 ? 'text-[26px] md:text-[32px]' : 'text-2xl md:text-3xl'}`}>{s.num}</div>
                  <div className="text-xs text-[rgba(245,240,232,0.35)] mt-1 tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION NAV (sticky scrollspy under the main nav) ── */}
      <SectionNav />

      {/* ── PROOF BAR ── */}
      <div className="border-y border-[rgba(201,168,76,0.08)] py-4 px-4 md:px-10 text-center">
        <p className="text-xs text-[rgba(245,240,232,0.28)] tracking-wide">
          Trusted by E-2 applicants from Canada, the UK, Germany, Australia, Japan, and 77 other treaty countries.
        </p>
      </div>

      {/* ── MISTAKES ── */}
      <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24 bg-[#0a0a0a]">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">What gets people denied</p>
        <h2 className="font-['Cormorant_Garamond',Georgia,serif] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3 leading-tight">
          The three most common E-2 mistakes.
        </h2>
        <p className="text-sm text-[rgba(245,240,232,0.42)] mb-10 md:mb-14 max-w-lg leading-relaxed">
          Most denials are not caused by ineligibility. They are caused by preparation errors that a structured process would have caught.
        </p>
        <div>
          {mistakes.map((m,i) => (
            <div key={i} className="grid grid-cols-[64px_1fr] md:grid-cols-[80px_1fr] border-t border-[rgba(201,168,76,0.08)] py-8 md:py-10 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[rgba(201,168,76,0)] group-hover:bg-[rgba(201,168,76,0.4)] transition-colors duration-300" />
              <div
                className="absolute left-[-12px] top-[-18px] font-['Cormorant_Garamond',Georgia,serif] font-light leading-none pointer-events-none select-none"
                style={{fontSize:'clamp(80px,14vw,160px)',color:'rgba(201,168,76,0.04)'}}
              >{m.n}</div>
              <div className="font-['Cormorant_Garamond',Georgia,serif] text-xs font-light text-[rgba(201,168,76,0.45)] tracking-[0.12em] uppercase pt-1 relative z-10">{m.n}</div>
              <div className="relative z-10">
                <div className="font-['Cormorant_Garamond',Georgia,serif] text-lg md:text-xl font-light italic text-[rgba(201,168,76,0.88)] mb-3 leading-snug">{m.t}</div>
                <p className="text-xs md:text-sm text-[rgba(245,240,232,0.5)] leading-relaxed max-w-2xl">{m.d}</p>
              </div>
            </div>
          ))}
          <div className="border-t border-[rgba(201,168,76,0.08)]" />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="scroll-mt-28 md:scroll-mt-36 px-4 md:px-10 lg:px-16 py-16 md:py-24 bg-[rgba(201,168,76,0.015)] border-y border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">How it works</p>
        <h2 className="font-['Cormorant_Garamond',Georgia,serif] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3 leading-tight">
          Four steps to your consulate package.
        </h2>
        <p className="text-sm text-[rgba(245,240,232,0.42)] mb-12 md:mb-16 max-w-lg leading-relaxed">
          No consultants. No back-and-forth. Your complete application, built and tested in days.
        </p>
        <div className="relative">
          <div className="hidden lg:block absolute top-[42px] left-[4%] right-[4%] h-px bg-[rgba(201,168,76,0.12)]" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 lg:gap-0">
            {[
              { n:"01", t:"Eligibility quiz", d:"14 questions. 4 minutes. Score out of 100, personalised risk flags, and your estimated timeline to interview.", filled:true },
              { n:"02", t:"E-2 Discovery & Gap Analysis", d:"A guided conversation across 12 tabs that captures everything the consulate will ask about. Your answers become your documents.", filled:true },
              { n:"03", t:"AI document engine", d:"Eight documents generated in sequence. Tested against 15 denial patterns. Cross-checked for consistency. Written in your voice.", filled:true },
              { n:"04", t:"Consulate package", d:"A complete formatted binder — every tab, every document, in the exact order your consulate expects. Download and go.", filled:false },
            ].map((s,i) => (
              <div key={i} className="lg:pr-8 relative z-10">
                <div className="mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.filled ? 'bg-[#C9A84C] shadow-[0_0_0_3px_rgba(201,168,76,0.15)]' : 'bg-[#0a0a0a] border border-[rgba(201,168,76,0.4)]'}`} />
                </div>
                <div
                  className="font-['Cormorant_Garamond',Georgia,serif] text-[64px] md:text-[72px] font-light leading-none mb-3 select-none"
                  style={{ WebkitTextStroke: "1px rgba(201,168,76,0.5)", color: "rgba(201,168,76,0.32)" }}
                >{s.n}</div>
                <div className="text-sm font-medium text-[#f5f0e8] mb-2">{s.t}</div>
                <p className="text-xs text-[rgba(245,240,232,0.42)] leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <div id="compare" className="scroll-mt-28 md:scroll-mt-36">
        <ComparisonSection />
      </div>

      {/* ── INTERVIEW SIMULATOR (compact callout) ── */}
      <section id="interview" className="scroll-mt-28 md:scroll-mt-36 px-4 md:px-10 lg:px-16 py-16 md:py-20 border-y border-[rgba(201,168,76,0.08)]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">
              Interview preparation
            </p>
            <h2 className="font-['Cormorant_Garamond',Georgia,serif] text-3xl md:text-4xl font-light text-[#f5f0e8] mb-4 leading-tight">
              Already have your documents? Practice your interview.
            </h2>
            <p className="text-sm text-[rgba(245,240,232,0.5)] leading-relaxed mb-7 max-w-xl">
              An AI consular officer reads your application, finds where you are weak,
              and probes it across three unscripted sessions — so nothing at the real
              interview is a surprise.
            </p>
            <Link href="/simulator"
              className="inline-flex w-full sm:w-auto text-center px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-xs font-medium tracking-widest uppercase hover:opacity-85 transition-opacity min-h-[44px] items-center justify-center">
              Start interview preparation →
            </Link>
          </div>
          <div className="border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.02)] p-6 md:p-7 md:min-w-[210px]">
            <div className="text-[10px] tracking-[0.15em] uppercase text-[rgba(201,168,76,0.45)] mb-2">Standalone</div>
            <div className="font-['Cormorant_Garamond',Georgia,serif] text-4xl md:text-5xl font-light text-[#C9A84C] leading-none mb-2">$197</div>
            <div className="text-[11px] text-[rgba(245,240,232,0.4)] leading-relaxed">3 sessions · Included free in every E2go package</div>
          </div>
        </div>
      </section>

      {/* ── FOUNDER NOTE ── */}
      <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-10 h-px bg-[#C9A84C] mx-auto mb-8 opacity-50" />
          <p className="font-['Cormorant_Garamond',Georgia,serif] text-xl md:text-2xl font-light italic text-[rgba(245,240,232,0.65)] leading-relaxed">
            Before preparation, there is procrastination.
            Weeks become months. Months become a year.
            And the move you have been planning quietly stays a plan.
            <br /><br />
            You already have what you need. All that is left is to make the jump.
          </p>
          <div className="w-10 h-px bg-[#C9A84C] mx-auto mt-8 opacity-50" />
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="reviews" className="scroll-mt-28 md:scroll-mt-36 px-4 md:px-10 lg:px-16 py-16 md:py-24 bg-[rgba(201,168,76,0.01)] border-y border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">From applicants</p>
        <h2 className="font-['Cormorant_Garamond',Georgia,serif] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-10 md:mb-12 leading-tight">
          What preparation actually feels like.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {[
            { q: "I had spoken to two consultants and walked away more confused than when I started. E2go was the first thing that actually explained what the consulate needed to see and why.", a: "Marco T.", c: "Italy", t: "Franchise applicant" },
            { q: "The source of funds section alone would have taken days with a consultant. The engine asked me the right questions and built the narrative from my answers.", a: "Aisha K.", c: "United Kingdom", t: "Solo applicant" },
            { q: "I downloaded the package on a Friday. By Monday I had reviewed every document. My consultant said it was the cleanest first draft she had ever seen from a self-prepared applicant.", a: "David L.", c: "Canada", t: "Partnership applicant" },
          ].map((t,i) => (
            <div key={i} className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-[rgba(201,168,76,0.08)] last:border-0 relative overflow-hidden bg-[rgba(201,168,76,0.012)]">
              <div className="absolute top-[-14px] left-[12px] font-['Cormorant_Garamond',Georgia,serif] text-[160px] font-light leading-none text-[rgba(201,168,76,0.04)] pointer-events-none select-none">&ldquo;</div>
              <p className="font-['Cormorant_Garamond',Georgia,serif] text-base md:text-lg font-light italic text-[rgba(245,240,232,0.76)] leading-relaxed mb-5 relative z-10">&ldquo;{t.q}&rdquo;</p>
              <div className="w-5 h-px bg-[rgba(201,168,76,0.45)] mb-3" />
              <div className="text-xs text-[rgba(245,240,232,0.5)]">— {t.a}</div>
              <div className="text-[10px] text-[rgba(201,168,76,0.55)] tracking-widest uppercase mt-1">{t.c} · {t.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-4 md:px-10 lg:px-16 py-20 md:py-32 text-center">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-4">Ready to begin</p>
        <h2 className="font-['Cormorant_Garamond',Georgia,serif] text-4xl md:text-6xl font-light text-[#f5f0e8] mb-4 leading-tight">
          Find out if you qualify.<br />It takes four minutes.
        </h2>
        <p className="text-sm text-[rgba(245,240,232,0.4)] mb-8 leading-relaxed">
          No payment required for the eligibility check. No account required to start.<br className="hidden md:block" />
          {" "}82 treaty countries. Every consulate. One platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/quiz" className="w-full sm:w-auto text-center px-10 py-4 bg-[#C9A84C] text-[#0a0a0a] text-xs font-medium tracking-widest uppercase hover:opacity-85 transition-opacity min-h-[44px] flex items-center justify-center">
            Check my eligibility →
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto text-center px-10 py-4 border border-[rgba(201,168,76,0.3)] text-[rgba(245,240,232,0.6)] text-xs tracking-widest uppercase hover:border-[rgba(201,168,76,0.6)] transition-colors min-h-[44px] flex items-center justify-center">
            View pricing
          </Link>
        </div>
        <p className="text-xs text-[rgba(245,240,232,0.2)] tracking-wide">Lawyer-ready documents. Lawyer-optional price.</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[rgba(201,168,76,0.08)] px-4 md:px-10 lg:px-16 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 md:mb-10">
          <div>
            <div className="font-['Cormorant_Garamond',Georgia,serif] text-xl font-light text-[#C9A84C] mb-2">
              E2go<span className="text-[rgba(245,240,232,0.5)]">.app</span>
            </div>
            <p className="text-xs text-[rgba(245,240,232,0.25)] leading-relaxed">© 2026 E2go.app. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 md:justify-end">
            {[["/#how-it-works","How it works"],["/learn","Learn"],["/pricing","Pricing"],["/simulator","Simulator"],["/support","Support"]].map(([href,label]) => (
              <Link key={label} href={href} className="text-xs text-[rgba(245,240,232,0.35)] hover:text-[rgba(245,240,232,0.7)] transition-colors min-h-[44px] flex items-center">{label}</Link>
            ))}
          </div>
        </div>
        {/* Legal — the closing word: full width, last thing on the page */}
        <div className="border-t border-[rgba(201,168,76,0.08)] pt-6">
          <p className="text-[10px] text-[rgba(245,240,232,0.25)] leading-relaxed max-w-4xl">
            E2go.app is a self-service document-preparation platform — not a law firm. It does
            not provide legal advice, legal representation, or immigration services, and no
            attorney–client relationship is formed by using it. All generated documents are
            drafts you must review before submission. Franchise brokers in the E2go network are
            compensated by the franchisor, not by you. If you would like an attorney
            recommendation we can point you in the right direction — that decision is yours.
          </p>
        </div>
      </footer>

    </div>
  );
}
