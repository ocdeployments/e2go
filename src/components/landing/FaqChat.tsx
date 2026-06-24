"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import Link from "next/link";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { useTypewriter } from "./useTypewriter";

// ---------------------------------------------------------------------------
// Starter question chips — common E-2 questions
// ---------------------------------------------------------------------------
export const STARTER_CHIPS = [
  "What are the E-2 investment requirements?",
  "Which countries qualify for the E-2 visa?",
  "How long does the E-2 process take?",
  "Can I bring my family on an E-2 visa?",
];

// Rotating prompts for the self-typing placeholder — phrased the way real
// applicants ask, kept short enough to read inside a single input row.
export const TYPING_PROMPTS = [
  "What's the minimum investment for my country?",
  "Can I bring my spouse and children?",
  "How long until my visa interview?",
  "Is my business “real and active” enough?",
  "Which treaty countries qualify?",
];

const STATIC_PLACEHOLDER =
  "Ask about E-2 visa requirements, process, countries…";

// ---------------------------------------------------------------------------
// Thinking-phase status phrases — on-brand, rotating
// ---------------------------------------------------------------------------
const THINKING_PHRASES = [
  "Searching the E-2 knowledge base…",
  "Drafting your answer…",
  "Reviewing E-2 requirements…",
  "Compiling your response…",
];

// ---------------------------------------------------------------------------
// Animation speed presets (matching existing border presets)
//   Pricing card = 10, CTA = 6, sidebar = 12
//   Ambient idle = 13 (slow, subtle), Thinking = 5 (energised)
// ---------------------------------------------------------------------------
const AMBIENT_SPEED = 13;
const THINKING_SPEED = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Message {
  role: "user" | "assistant";
  content: string;
  layer?: string;
}

/** Imperative handle so a parent (e.g. the mobile teaser) can drive the chat. */
export interface FaqChatHandle {
  submit: (text: string) => void;
  focusInput: () => void;
}

interface FaqChatProps {
  /**
   * `inline` wraps the chat in the animated gold border (/learn, /results).
   * `sheet` renders the bare chat for a parent-provided surface (the mobile
   * bottom sheet and the homepage hero panel supply their own chrome).
   */
  variant?: "inline" | "sheet";
  /**
   * When true, the empty-state input placeholder self-types rotating E-2
   * questions — the "alive" come-use-me signal on the homepage hero panel.
   * Reverts to the static placeholder on focus, once typing, or after the
   * conversation starts. Off everywhere else.
   */
  animatedPlaceholder?: boolean;
  /**
   * When true, the chat fills its parent's height as a flex column: the
   * messages area grows to fill the available space and scrolls internally
   * (with overscroll containment) while the input stays pinned at the bottom.
   * The desktop hero panel uses this so a long answer scrolls *inside* a
   * fixed-height card instead of growing the card and dragging the page.
   */
  fill?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const FaqChat = forwardRef<FaqChatHandle, FaqChatProps>(function FaqChat(
  { variant = "inline", animatedPlaceholder = false, fill = false, className = "" },
  ref
) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhraseIdx, setThinkingPhraseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---- Cycle thinking phrases ----
  useEffect(() => {
    if (!isThinking) return;
    setThinkingPhraseIdx(0);
    const interval = setInterval(() => {
      setThinkingPhraseIdx((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isThinking]);

  // ---- Derived border speed ----
  const borderSpeed = isThinking ? THINKING_SPEED : AMBIENT_SPEED;

  // ---- Self-typing placeholder (homepage hero "alive" signal) ----
  // Only animates in the resting empty state; reverts to the static prompt the
  // moment the user focuses, types, or a conversation begins.
  const placeholderActive =
    animatedPlaceholder &&
    !inputFocused &&
    query === "" &&
    messages.length === 0 &&
    !isStreaming;
  const typedPlaceholder = useTypewriter({
    phrases: TYPING_PROMPTS,
    enabled: placeholderActive,
  });
  const inputPlaceholder =
    placeholderActive && typedPlaceholder ? typedPlaceholder : STATIC_PLACEHOLDER;

  // ---- Auto-scroll to bottom as content streams ----
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // Only auto-scroll if user is near the bottom (within 80px)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isThinking]);

  // ---- Submit ----
  const handleSubmit = useCallback(
    async (text?: string) => {
      const q = (text || query).trim();
      if (!q || isStreaming) return;

      setError(null);
      setQuery("");
      setMessages((prev) => [...prev, { role: "user", content: q }]);
      setIsThinking(true);
      setIsStreaming(true);

      try {
        const res = await fetch("/api/faq/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });

        // Handle non-streaming JSON responses (rate limit, scope guard, errors)
        if (res.headers.get("Content-Type")?.includes("application/json")) {
          const data = await res.json();
          const answer =
            data.message || data.answer || data.error || "Something went wrong.";
          const layer = data.layer || "json_response";
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: answer, layer },
          ]);
          setIsThinking(false);
          setIsStreaming(false);
          return;
        }

        // Streaming text response
        const layer = res.headers.get("X-FAQ-Layer") || "unknown";
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let firstTokenReceived = false;

        // Add placeholder for streaming content
        setMessages((prev) => [...prev, { role: "assistant", content: "", layer }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          // Clear thinking state on first token
          if (!firstTokenReceived) {
            firstTokenReceived = true;
            setIsThinking(false);
          }

          // Update the last message with accumulated content
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: accumulated,
              layer,
            };
            return updated;
          });
        }
      } catch {
        setError("Something went wrong. Please try again.");
        // Remove the user message if the request failed
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsThinking(false);
        setIsStreaming(false);
        // Scroll to bottom after completion
        setTimeout(() => {
          const container = scrollContainerRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 50);
      }
    },
    [query, isStreaming]
  );

  // ---- Expose imperative controls to parent (mobile teaser) ----
  useImperativeHandle(
    ref,
    () => ({
      submit: (text: string) => {
        void handleSubmit(text);
      },
      focusInput: () => {
        inputRef.current?.focus();
      },
    }),
    [handleSubmit]
  );

  // ---- Key handler ----
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  // ---- Check if content overflows (for gradient fade) ----
  const [showFade, setShowFade] = useState(false);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const checkOverflow = (): void => {
      const hasOverflow = container.scrollHeight > container.clientHeight + 4;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        30;
      setShowFade(hasOverflow && !isNearBottom);
    };
    checkOverflow();
    container.addEventListener("scroll", checkOverflow, { passive: true });
    return () => container.removeEventListener("scroll", checkOverflow);
  }, [messages, isThinking]);

  // ---- Shared inner chat surface ----
  const inner = (
    <div className={`bg-[#0a0a0a]${fill ? " flex flex-col flex-1 min-h-0" : ""}`}>
      {/* Messages area — scrollable container. In `fill` mode it flexes to fill
          the card and scrolls internally; overscroll-contain keeps that scroll
          from chaining to the page so the background never moves. Otherwise it
          caps at a fixed max-height. */}
      <div className={`relative${fill ? " flex-1 min-h-0" : ""}`}>
        <div
          ref={scrollContainerRef}
          className={
            fill
              ? "px-5 py-5 space-y-4 overflow-y-auto overscroll-contain h-full flex flex-col"
              : variant === "sheet"
                ? "px-5 py-5 space-y-4 overflow-y-auto overscroll-contain max-h-[42vh]"
                : "px-5 py-5 space-y-4 overflow-y-auto overscroll-contain"
          }
          style={fill || variant === "sheet" ? undefined : { maxHeight: "320px" }}
        >
          {messages.length === 0 && !isStreaming && (
            <div className={`text-center py-4${fill ? " my-auto" : ""}`}>
              <p className="text-sm text-[rgba(245,240,232,0.68)] mb-5">
                Start with a question below, or try one of these:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {STARTER_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSubmit(chip)}
                    className="px-3 py-2 text-xs border border-[rgba(201,168,76,0.2)] text-[rgba(201,168,76,0.75)] hover:border-[rgba(201,168,76,0.5)] hover:text-[#C9A84C] transition-colors min-h-[36px] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "text-right" : ""}>
              {msg.role === "user" ? (
                <div className="inline-block px-4 py-2.5 bg-[rgba(201,168,76,0.08)] text-sm text-[#f5f0e8] max-w-[85%] text-left">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[90%]">
                  <div className="text-sm text-[rgba(245,240,232,0.7)] leading-relaxed whitespace-pre-wrap">
                    {msg.content || null}
                  </div>
                  {/* Soft CTA after answer */}
                  {msg.content && msg.role === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-[rgba(201,168,76,0.08)]">
                      <Link
                        href="/quiz"
                        className="inline-flex items-center gap-1.5 text-xs text-[rgba(201,168,76,0.65)] hover:text-[#C9A84C] transition-colors"
                      >
                        Get a personalised eligibility picture
                        <span className="text-[10px]">→</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator — shares the same scrollable container */}
          {isThinking && (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
              <span className="text-[rgba(201,168,76,0.7)] font-['Cormorant_Garamond',Georgia,serif] text-base italic">
                {THINKING_PHRASES[thinkingPhraseIdx]}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Gradient fade affordance at bottom when content overflows */}
        {showFade && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
            style={{
              background: "linear-gradient(to bottom, transparent, #0a0a0a)",
            }}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-2.5 border-t border-[rgba(201,168,76,0.08)] text-xs text-[rgba(201,168,76,0.8)]">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[rgba(201,168,76,0.1)] px-5 py-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            disabled={isStreaming}
            className="flex-1 text-sm text-[#f5f0e8] placeholder:text-[rgba(245,240,232,0.68)] outline-none min-h-[44px] px-3 border transition-colors duration-200"
            style={{
              background: "rgba(201,168,76,0.05)",
              borderColor: "rgba(201,168,76,0.40)",
            }}
            onFocus={(e) => {
              setInputFocused(true);
              e.currentTarget.style.borderColor = "#C9A84C";
              e.currentTarget.style.background = "rgba(201,168,76,0.08)";
            }}
            onBlur={(e) => {
              setInputFocused(false);
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.40)";
              e.currentTarget.style.background = "rgba(201,168,76,0.05)";
            }}
            aria-label="Ask a question about the E-2 visa"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!query.trim() || isStreaming}
            className="px-4 text-xs text-[#0a0a0a] bg-[#C9A84C] hover:opacity-85 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center tracking-widest uppercase cursor-pointer"
            aria-label="Send question"
          >
            →
          </button>
        </div>
        <p className="text-[10px] text-[rgba(245,240,232,0.65)] mt-2.5">
          Informational only — not legal advice. e2go is not a law firm.
        </p>
      </div>
    </div>
  );

  // Bare surface for a parent-provided sheet.
  if (variant === "sheet") {
    return inner;
  }

  // Animated gold border for inline placements.
  return (
    <BorderRotate
      animationMode="auto-rotate"
      animationSpeed={borderSpeed}
      borderWidth={1}
      className={`max-w-2xl ${className}`.trim()}
    >
      {inner}
    </BorderRotate>
  );
});

export default FaqChat;
