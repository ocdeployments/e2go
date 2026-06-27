"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import FaqChat, { type FaqChatHandle, TYPING_PROMPTS } from "./FaqChat";
import { useTypewriter } from "./useTypewriter";

// ---------------------------------------------------------------------------
// FaqWidgetHome — the homepage's hero centerpiece: a "living" Ask e2go panel
// that sits where the flag backdrop is, inviting the visitor to use it as the
// first interactive moment on the page.
//
// Desktop (md+): a gold-bordered, softly glowing frame with a live "online"
// dot header wrapping the real chat. The input placeholder self-types rotating
// E-2 questions until the visitor engages.
//
// Mobile (<md): the chat would congest the hero, so it rests as an alive teaser
// bar — a breathing glow, a live dot, and a self-typing prompt. Tapping it opens
// the conversation in a focused bottom sheet that slides up over a dimmed page;
// closing returns the reader exactly where they were.
// ---------------------------------------------------------------------------

/** Set the `inert` attribute without fighting TS lib differences. */
function setInert(el: HTMLElement | null, value: boolean): void {
  if (el) (el as HTMLElement & { inert: boolean }).inert = value;
}

export default function FaqWidgetHome() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const mobileChatRef = useRef<FaqChatHandle>(null);
  const teaserBtnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Tracks whether the sheet has ever opened, so focus is only restored to the
  // teaser when the sheet actually closes — never on the initial mount.
  const hasOpenedRef = useRef(false);

  // Self-typing teaser prompt — pauses while the sheet is open (it's hidden
  // behind the sheet anyway) and falls back to a static line via the hook.
  const teaserText = useTypewriter({
    phrases: TYPING_PROMPTS,
    enabled: !sheetOpen,
  });

  // Open the sheet, optionally firing a starter question. Kept synchronous so
  // the input focus stays inside the user gesture (mobile keyboards only open
  // for focus triggered during a real tap).
  const openSheet = useCallback((question?: string): void => {
    setSheetOpen(true);
    setInert(sheetRef.current, false);
    if (question) {
      mobileChatRef.current?.submit(question);
    } else {
      mobileChatRef.current?.focusInput();
    }
  }, []);

  // Close is state-only. Focus is restored to the teaser in the effect below —
  // doing it here would fight the still-attached focus trap, which would pull
  // focus back into the sheet just before it turns inert (landing on <body>).
  const closeSheet = useCallback((): void => {
    setSheetOpen(false);
  }, []);

  // Initialise / track the inert state of the closed sheet so keyboard and
  // screen-reader users can't reach the off-screen chat.
  useEffect(() => {
    setInert(sheetRef.current, !sheetOpen);
  }, [sheetOpen]);

  // While the sheet is open: lock body scroll, close on Escape, and keep focus
  // trapped inside the sheet.
  useEffect(() => {
    if (!sheetOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") closeSheet();
    };
    const onFocusIn = (e: FocusEvent): void => {
      const sheet = sheetRef.current;
      if (sheet && e.target instanceof Node && !sheet.contains(e.target)) {
        mobileChatRef.current?.focusInput();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [sheetOpen, closeSheet]);

  // Restore focus to the teaser once the sheet closes. Declared after the
  // focus-trap effect so it runs after that effect's cleanup detaches the
  // trap — only then does moving focus back to the teaser stick.
  useEffect(() => {
    if (sheetOpen) {
      hasOpenedRef.current = true;
    } else if (hasOpenedRef.current) {
      teaserBtnRef.current?.focus();
    }
  }, [sheetOpen]);

  return (
    <div className="w-full">
      {/* ── Desktop: living framed chat, pinned top-right over the flag ── */}
      <div className="hidden md:block relative">
        {/* Dark "stage" — softly mutes the busy flag stripes directly around the
            panel so the card reads as its own premium surface. This is the clear
            flag → widget transition the eye needs. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-12 lg:-inset-20"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(7,7,7,0.96) 26%, rgba(7,7,7,0.62) 56%, rgba(7,7,7,0) 82%)",
          }}
        />
        {/* Ambient breathing gold glow hugging the panel edge */}
        <div
          aria-hidden="true"
          className="e2-ask-glow pointer-events-none absolute inset-0"
        />
        {/* The panel — solid surface, 2px gold top accent (echoing the mobile
            sheet), hairline gold frame, and a soft lift shadow to float it
            clearly off the flag. */}
        <div className="relative bg-[#0d0d0d] border border-[rgba(201,168,76,0.22)] border-t-2 border-t-[#C9A84C] shadow-[0_28px_64px_-28px_rgba(0,0,0,0.95)] h-[460px] flex flex-col">
          {/* Header — live presence + free/instant reassurance */}
          <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-[rgba(201,168,76,0.12)]">
            <span className="flex items-center gap-2.5 text-[11px] tracking-[0.16em] uppercase text-[rgba(201,168,76,0.9)]">
              <span className="e2-livedot w-[7px] h-[7px] rounded-full bg-[#C9A84C]" />
              Ask e2go
            </span>
            <span className="text-[10px] tracking-[0.12em] uppercase text-[rgba(245,240,232,0.72)]">
              Free · instant answer
            </span>
          </div>
          <FaqChat variant="sheet" fill animatedPlaceholder />
        </div>
      </div>

      {/* ── Mobile: alive teaser bar → bottom sheet ── */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2.5">
          <span className="flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase text-[rgba(201,168,76,0.85)]">
            <span className="e2-livedot w-[6px] h-[6px] rounded-full bg-[#C9A84C]" />
            Ask e2go
          </span>
          <span className="text-[10px] tracking-[0.12em] uppercase text-[rgba(245,240,232,0.68)]">
            Free · instant
          </span>
        </div>
        <div className="relative">
          <div
            aria-hidden="true"
            className="e2-ask-glow pointer-events-none absolute inset-0"
          />
          <button
            ref={teaserBtnRef}
            onClick={() => openSheet()}
            className="relative w-full flex items-center gap-3 pl-4 pr-2 py-3 bg-[#0d0d0d] border border-[rgba(201,168,76,0.5)] hover:border-[#C9A84C] transition-colors"
            aria-label="Ask anything about the E-2 visa"
          >
            <span className="flex-1 text-left text-[rgba(245,240,232,0.7)] text-sm truncate">
              {teaserText || "Ask anything about the E-2…"}
              <span className="e2-caret text-[#C9A84C] ml-0.5">|</span>
            </span>
            <span className="w-9 h-9 bg-[#C9A84C] text-[#0a0a0a] flex items-center justify-center flex-shrink-0 text-sm">
              →
            </span>
          </button>
        </div>
        <p className="text-[10px] text-[rgba(245,240,232,0.65)] mt-3">
          Informational only — not legal advice. e2go is not a law firm.
        </p>
      </div>

      {/* Mobile: dimmed scrim behind the sheet */}
      <div
        onClick={closeSheet}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-[55] bg-black/70 transition-opacity duration-300 ${
          sheetOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile: bottom sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ask e2go"
        className={`md:hidden fixed inset-x-0 bottom-0 z-[60] bg-[#0a0a0a] border-t-2 border-[#C9A84C] transition-transform duration-300 ease-out ${
          sheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-3">
          <span className="w-9 h-1 rounded-full bg-[rgba(201,168,76,0.3)]" />
        </div>
        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.7)]">
            Ask e2go
          </p>
          <button
            onClick={closeSheet}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-[rgba(245,240,232,0.76)] hover:text-[#f5f0e8] text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <FaqChat ref={mobileChatRef} variant="sheet" />
      </div>
    </div>
  );
}
