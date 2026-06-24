"use client";

import FaqChat from "./FaqChat";

// ---------------------------------------------------------------------------
// FaqWidget — the full Ask E2go section (header + inline chat).
// Used on /learn and /results. The homepage uses FaqWidgetHome, which adds a
// mobile teaser → bottom-sheet treatment to avoid congesting small screens.
// ---------------------------------------------------------------------------
export default function FaqWidget() {
  return (
    <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24">
      {/* Header */}
      <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">
        Ask E2go
      </p>
      <h2 className="font-['Cormorant_Garamond',Georgia,serif] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3 leading-tight">
        E-2 advice is everywhere. Straight answers aren&rsquo;t.
      </h2>
      <p className="text-sm text-[rgba(245,240,232,0.72)] mb-10 md:mb-12 max-w-lg leading-relaxed">
        Every forum thread has a different story. Ask your specific question and
        get one clear, consistent answer — drawn from 350+ vetted Q&amp;A pairs
        and our complete knowledge base.
      </p>

      <FaqChat />
    </section>
  );
}
