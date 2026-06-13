"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { BorderRotate } from "@/components/ui/animated-gradient-border";

// ---------------------------------------------------------------------------
// Starter question chips — common E-2 questions
// ---------------------------------------------------------------------------
const STARTER_CHIPS = [
  "What are the E-2 investment requirements?",
  "Which countries qualify for the E-2 visa?",
  "How long does the E-2 process take?",
  "Can I bring my family on an E-2 visa?",
];

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FaqWidget() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
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
          setMessages((prev) => [...prev, { role: "assistant", content: answer, layer }]);
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

  // ---- Key handler ----
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ---- Check if content overflows (for gradient fade) ----
  const [showFade, setShowFade] = useState(false);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const checkOverflow = () => {
      const hasOverflow =
        container.scrollHeight > container.clientHeight + 4;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 30;
      setShowFade(hasOverflow && !isNearBottom);
    };
    checkOverflow();
    container.addEventListener("scroll", checkOverflow, { passive: true });
    return () => container.removeEventListener("scroll", checkOverflow);
  }, [messages, isThinking]);

  return (
    <section className="px-4 md:px-10 lg:px-16 py-16 md:py-24">
      {/* Header */}
      <p className="text-[10px] tracking-[0.18em] uppercase text-[rgba(201,168,76,0.6)] mb-3">
        Ask E2go
      </p>
      <h2 className="font-['Cormorant_Garamond',Georgia,serif] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3 leading-tight">
        E-2 advice is everywhere. Straight answers aren&rsquo;t.
      </h2>
      <p className="text-sm text-[rgba(245,240,232,0.42)] mb-10 md:mb-12 max-w-lg leading-relaxed">
        Every forum thread has a different story. Ask your specific question
        and get one clear, consistent answer — drawn from 350+ vetted Q&amp;A
        pairs and our complete knowledge base.
      </p>

      {/* Widget container — wrapped in animated gradient border */}
      <BorderRotate
        animationMode="auto-rotate"
        animationSpeed={borderSpeed}
        borderWidth={1}
        className="max-w-2xl"
      >
        <div className="bg-[#0a0a0a]">
          {/* Messages area — scrollable container with max-height */}
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className="px-5 py-5 space-y-4 overflow-y-auto"
              style={{ maxHeight: "320px" }}
            >
              {messages.length === 0 && !isStreaming && (
                <div className="text-center py-4">
                  <p className="text-sm text-[rgba(245,240,232,0.35)] mb-5">
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
                  background:
                    "linear-gradient(to bottom, transparent, #0a0a0a)",
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
                placeholder="Ask about E-2 visa requirements, process, countries…"
                disabled={isStreaming}
                className="flex-1 text-sm text-[#f5f0e8] placeholder:text-[rgba(245,240,232,0.3)] outline-none min-h-[44px] px-3 border transition-colors duration-200"
                style={{
                  background: "rgba(201,168,76,0.05)",
                  borderColor: "rgba(201,168,76,0.40)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#C9A84C";
                  e.currentTarget.style.background = "rgba(201,168,76,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(201,168,76,0.40)";
                  e.currentTarget.style.background = "rgba(201,168,76,0.05)";
                }}
                aria-label="Ask a question about the E-2 visa"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!query.trim() || isStreaming}
                className="px-4 text-xs text-[#0a0a0a] bg-[#C9A84C] hover:opacity-85 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center tracking-widest uppercase cursor-pointer"
              >
                →
              </button>
            </div>
            <p className="text-[10px] text-[rgba(245,240,232,0.2)] mt-2.5">
              Informational only — not legal advice. e2go is not a law firm.
            </p>
          </div>
        </div>
      </BorderRotate>
    </section>
  );
}
