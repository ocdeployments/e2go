"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface CrossTabNoteProps {
  coversTabs: string[];
  note: string;
}

export default function CrossTabNote({ coversTabs: _coversTabs, note }: CrossTabNoteProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative inline-block align-middle ml-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center justify-center text-[#C9A84C] hover:text-[#d4b35a] transition-colors"
        aria-label="Toggle cross-tab note"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {isExpanded && (
        <div
          className="absolute z-10 mt-2 w-64 p-3 transition-all duration-300 ease-in-out"
          style={{
            background: "rgba(201,168,76,0.04)",
            borderLeft: "1.5px solid rgba(201,168,76,0.3)",
            borderRadius: 0,
          }}
        >
          <div className="flex justify-between items-start gap-2">
            <div>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "rgba(245,240,232,0.6)", fontFamily: "'DM Sans', sans-serif" }}
              >
                {note}
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[#C9A84C] hover:text-[#d4b35a] transition-colors flex-shrink-0"
              aria-label="Close note"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
