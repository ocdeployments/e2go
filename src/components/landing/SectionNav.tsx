"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// SectionNav — a slim secondary bar that sticks just beneath the main nav once
// the visitor scrolls past the hero. It lets people jump straight to any major
// section and shows where they are with a gold underline (scrollspy).
//
// Deliberately NOT content-hiding tabs: every section stays in the page, which
// keeps the proof visible and keeps the page citable by search/AI engines. This
// only adds wayfinding on top of the existing long-scroll.
//
// Desktop: a row of underlined links + a gold "Check eligibility" shortcut.
// Mobile: a horizontally scrollable chip row with no visible scrollbar.
// ---------------------------------------------------------------------------

interface NavSection {
  id: string;
  label: string;
}

const SECTIONS: NavSection[] = [
  { id: "how-it-works", label: "How it works" },
  { id: "compare", label: "Compare" },
  { id: "interview", label: "Interview prep" },
  { id: "reviews", label: "Reviews" },
];

export default function SectionNav() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  // Scrollspy: highlight the last section whose top has scrolled beneath the
  // sticky nav stack. Positions are read inside requestAnimationFrame so the
  // passive scroll listener never forces a synchronous layout on the scroll
  // thread (keeps scrolling smooth).
  useEffect(() => {
    let frame = 0;

    const computeActive = (): void => {
      frame = 0;
      // Trigger line sits a little below the main nav + this bar, so a section
      // lights up just after its heading slides under the sticky chrome.
      const triggerLine = window.innerWidth >= 768 ? 150 : 120;
      let nextId = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - triggerLine <= 0) {
          nextId = section.id;
        }
      }
      setActiveId((prev) => (prev === nextId ? prev : nextId));
    };

    const onScroll = (): void => {
      if (frame) return;
      frame = window.requestAnimationFrame(computeActive);
    };

    computeActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-16 md:top-20 z-40 bg-[rgba(10,10,10,0.92)] backdrop-blur-md border-b border-[rgba(201,168,76,0.12)]"
    >
      <div className="px-4 md:px-10 lg:px-16">
        {/* Desktop: underlined section links + eligibility shortcut */}
        <div className="hidden md:flex items-stretch h-12 gap-8">
          {SECTIONS.map((section) => {
            const active = activeId === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setActiveId(section.id)}
                aria-current={active ? "true" : undefined}
                className={`relative flex items-center text-[13px] tracking-wide transition-colors ${
                  active
                    ? "text-[#C9A84C]"
                    : "text-[rgba(245,240,232,0.5)] hover:text-[#f5f0e8]"
                }`}
              >
                {section.label}
                {active && (
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#C9A84C]" />
                )}
              </a>
            );
          })}
          <Link
            href="/quiz"
            className="ml-auto flex items-center text-[11px] tracking-[0.16em] uppercase text-[#C9A84C] hover:opacity-80 transition-opacity"
          >
            Check eligibility →
          </Link>
        </div>

        {/* Mobile: horizontally scrollable chip row */}
        <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar">
          {SECTIONS.map((section) => {
            const active = activeId === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setActiveId(section.id)}
                aria-current={active ? "true" : undefined}
                className={`min-h-[44px] flex items-center whitespace-nowrap px-3.5 text-xs tracking-wide border transition-colors ${
                  active
                    ? "border-[#C9A84C] text-[#C9A84C]"
                    : "border-[rgba(201,168,76,0.2)] text-[rgba(245,240,232,0.5)]"
                }`}
              >
                {section.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
