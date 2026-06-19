"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// useTypewriter — drives a self-typing string that types a phrase, holds it,
// deletes it, and advances to the next, looping forever. Used by the Ask E2go
// panel to make the prompt feel "alive" (the strongest come-use-me signal).
//
// Returns "" while disabled. Honours prefers-reduced-motion by parking on the
// first phrase with no animation, so callers always have a sensible static
// string to render as a fallback.
// ---------------------------------------------------------------------------

interface TypewriterOptions {
  /** Phrases to cycle through, in order. */
  phrases: string[];
  /** When false, the effect parks and returns "" (caller shows its own text). */
  enabled?: boolean;
  /** Milliseconds per character while typing. */
  typeSpeed?: number;
  /** Milliseconds per character while deleting. */
  deleteSpeed?: number;
  /** Milliseconds to hold a fully typed phrase before deleting. */
  holdTime?: number;
}

export function useTypewriter({
  phrases,
  enabled = true,
  typeSpeed = 55,
  deleteSpeed = 26,
  holdTime = 1700,
}: TypewriterOptions): string {
  const [text, setText] = useState("");

  // Hold the latest phrases in a ref so an inline array literal from the caller
  // doesn't restart the loop on every render.
  const phrasesRef = useRef<string[]>(phrases);
  phrasesRef.current = phrases;

  useEffect(() => {
    if (!enabled || phrasesRef.current.length === 0) {
      setText("");
      return;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setText(phrasesRef.current[0]);
      return;
    }

    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = (): void => {
      const list = phrasesRef.current;
      const current = list[phraseIdx % list.length];

      if (!deleting) {
        charIdx += 1;
        setText(current.slice(0, charIdx));
        if (charIdx >= current.length) {
          deleting = true;
          timer = setTimeout(tick, holdTime);
          return;
        }
        timer = setTimeout(tick, typeSpeed);
      } else {
        charIdx -= 1;
        setText(current.slice(0, Math.max(0, charIdx)));
        if (charIdx <= 0) {
          deleting = false;
          phraseIdx += 1;
          timer = setTimeout(tick, typeSpeed * 5);
          return;
        }
        timer = setTimeout(tick, deleteSpeed);
      }
    };

    timer = setTimeout(tick, 450);
    return () => clearTimeout(timer);
  }, [enabled, typeSpeed, deleteSpeed, holdTime]);

  return text;
}
