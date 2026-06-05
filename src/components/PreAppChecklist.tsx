"use client";

import { useState } from "react";
import { Check, X, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

export interface ChecklistItem {
  id: string;
  document: string;
  condition: string;
  source: "always" | "pre-filled" | "quiz-derived";
  prefillNote: string | null;
  required: boolean;
  tabReference: string;
  sharedTab?: string;
  warning?: string;
}

interface PreAppChecklistProps {
  items: ChecklistItem[];
  promptForQuiz?: boolean;
}

export default function PreAppChecklist({ items, promptForQuiz = false }: PreAppChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  if (promptForQuiz || items.length === 0) {
    return (
      <div className="p-8 border border-[#C9A84C]/20 bg-[#0a0a0a] text-[#f5f0e8] font-[DM_Sans]">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-[#C9A84C]" />
          <h3 className="text-lg font-medium">Personalised Checklist Unavailable</h3>
        </div>
        <p className="text-[#f5f0e8]/70 mb-6 font-[DM_Sans]">
          Take our eligibility quiz to see a personalised checklist built specifically for your situation.
        </p>
        <a
          href="/quiz"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#C9A84C] text-[#0a0a0a] font-medium font-[DM_Sans] hover:bg-[#d4b35a] transition-colors"
        >
          Take Eligibility Quiz
        </a>
      </div>
    );
  }

  const visibleItems = items.filter(item => !hiddenItems.has(item.id));
  const removedItems = items.filter(item => hiddenItems.has(item.id));

  const handleToggle = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const handleRemove = (id: string) => {
    setHiddenItems(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleRestore = (id: string) => {
    setHiddenItems(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="border border-[#C9A84C]/20 bg-[#0a0a0a] text-[#f5f0e8] font-[DM_Sans]">
      {/* Summary Header */}
      <div className="p-6 border-b border-[#C9A84C]/20 bg-[#C9A84C]/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#C9A84C] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-[#f5f0e8] mb-1">
              Your Personalised Checklist
            </h3>
            <p className="text-sm text-[#f5f0e8]/70 leading-relaxed">
              This checklist was built from your eligibility check answers. Items marked{' '}
              <span className="text-[#C9A84C] font-medium">&apos;Pre-filled&apos;</span> were added automatically based on what you told us. Remove any item that does not apply.
            </p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-[#C9A84C]/10">
        {visibleItems.map(item => (
          <div
            key={item.id}
            className="p-4 hover:bg-[#ffffff]/[0.02] transition-colors group"
          >
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(item.id)}
                className={`mt-0.5 w-5 h-5 flex items-center justify-center border transition-all flex-shrink-0 ${
                  checkedItems.has(item.id)
                    ? "bg-[#C9A84C] border-[#C9A84C]"
                    : "bg-transparent border-[#C9A84C]/40"
                }`}
                aria-label={`Mark ${item.document} as checked`}
              >
                {checkedItems.has(item.id) && (
                  <Check className="w-3.5 h-3.5 text-[#0a0a0a]" />
                )}
              </button>

              {/* Content */}
              <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-sm font-medium ${
                      checkedItems.has(item.id) ? "text-[#f5f0e8]/50 line-through" : "text-[#f5f0e8]"
                    }`}
                  >
                    {item.document}
                  </span>
                  {item.source === "pre-filled" && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-[#0a0a0a] bg-[#C9A84C]">
                      Pre-filled
                    </span>
                  )}
                  {item.warning && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                      Attention
                    </span>
                  )}
                </div>

                {/* Sub-info row */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#f5f0e8]/50">
                  <span className="font-mono text-[#C9A84C]/70">{item.tabReference}</span>

                  {item.sharedTab && (
                    <div className="flex items-center gap-1 group/tooltip relative">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Shared document</span>
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block w-64 p-2 bg-[#1c1c1c] border border-[#C9A84C]/20 text-[#f5f0e8]/80 text-xs z-10">
                        This document covers both {item.sharedTab}. One certified copy is sufficient.
                      </div>
                    </div>
                  )}
                </div>

                {/* Prefill Note */}
                {item.prefillNote && (
                  <p className="mt-2 text-xs text-[#f5f0e8]/60 italic leading-relaxed">
                    {item.prefillNote}
                  </p>
                )}
              </div>

              {/* Remove Action */}
              {item.source === "pre-filled" && (
                <button
                  onClick={() => handleRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-[#f5f0e8]/40 hover:text-[#f5f0e8]/80 transition-opacity px-2 py-1"
                  title="Remove this item"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Hidden Items Section */}
      {removedItems.length > 0 && (
        <div className="border-t border-[#C9A84C]/20 bg-[#0a0a0a]">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="w-full flex items-center justify-between p-4 text-sm text-[#f5f0e8]/60 hover:text-[#f5f0e8] hover:bg-[#ffffff]/[0.02] transition-colors"
          >
            <span className="flex items-center gap-2">
              {showHidden ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Hidden items ({removedItems.length})
            </span>
          </button>

          {showHidden && (
            <div className="divide-y divide-[#C9A84C]/10 pb-4">
              {removedItems.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#f5f0e8]/50 line-through">{item.document}</span>
                    <span className="text-xs font-mono text-[#C9A84C]/50">{item.tabReference}</span>
                  </div>
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="text-xs text-[#C9A84C] hover:text-[#d4b35a] transition-colors px-2 py-1"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}