"use client";

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";

export interface PreFilledFieldProps {
  questionId: string;
  label: string;
  children: React.ReactNode;
  prefillValue: string | string[] | null;
  prefillNote: string | null;
  onEdit?: () => void;
  onRevert?: () => void;
  requiresConfirmation?: boolean;
  confirmationText?: string;
  isConfirmed?: boolean;
  onConfirmChange?: (checked: boolean) => void;
  isOverridden?: boolean;
}

export default function PreFilledField({
  questionId,
  label,
  children,
  prefillValue,
  prefillNote,
  onEdit,
  onRevert,
  requiresConfirmation = false,
  confirmationText,
  isConfirmed = false,
  onConfirmChange,
  isOverridden: externalIsOverridden,
}: PreFilledFieldProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(!prefillValue);
  const [internalIsOverridden, setInternalIsOverridden] = useState(false);

  const isEditing = internalIsEditing;
  const isOverridden = externalIsOverridden !== undefined ? externalIsOverridden : internalIsOverridden;

  useEffect(() => {
    if (!prefillValue) {
      setInternalIsEditing(true);
      setInternalIsOverridden(false);
    } else {
      setInternalIsEditing(false);
      setInternalIsOverridden(false);
    }
  }, [prefillValue, questionId]);

  const handleEdit = () => {
    setInternalIsEditing(true);
    setInternalIsOverridden(false);
    if (requiresConfirmation && onConfirmChange) {
      onConfirmChange(false);
    }
    onEdit?.();
  };

  const handleRevert = () => {
    setInternalIsEditing(false);
    setInternalIsOverridden(false);
    onRevert?.();
  };

  const handleUserChange = () => {
    if (prefillValue && !internalIsOverridden) {
      setInternalIsOverridden(true);
    }
  };

  // Clone children to inject onChange handler for override detection
  const childrenWithChangeHandler = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && typeof child.props.onChange === "function") {
      const originalOnChange = child.props.onChange;
      return React.cloneElement(child, {
        ...child.props,
        onChange: (e: React.ChangeEvent<HTMLInputElement> | string | string[] | number | null) => {
          originalOnChange(e);
          handleUserChange();
        },
      });
    }
    return child;
  });

  const hasPrefill = prefillValue !== null && prefillValue !== "" && prefillValue !== undefined;

  if (!hasPrefill) {
    return (
      <div className="mb-6">
        <label className="block text-[12px] font-medium tracking-wider uppercase text-[#f5f0e8]/60 mb-2 font-[DM_Sans]">
          {label}
        </label>
        {children}
      </div>
    );
  }

  let badgeText = "Pre-filled";
  let badgeColor = "bg-[#C9A84C] text-[#0a0a0a]";

  if (isOverridden) {
    badgeText = "Modified";
    badgeColor = "bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/40";
  } else if (isEditing) {
    badgeText = "Editing";
    badgeColor = "bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/40";
  }

  return (
    <div className="mb-6">
      <div className="relative border border-[#C9A84C]/15 bg-transparent p-4 transition-all duration-200">
        {/* Badge */}
        <div className="absolute -top-2.5 right-4">
          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${badgeColor}`}>
            {badgeText}
          </span>
        </div>

        {/* Label */}
        <label className="block text-[12px] font-medium tracking-wider uppercase text-[#f5f0e8]/60 mb-2 font-[DM_Sans]">
          {label}
        </label>

        {/* Content */}
        <div className="mb-2">
          {isEditing ? childrenWithChangeHandler : (
            <div className="text-[15px] text-[#f5f0e8]/50 font-[DM_Sans] py-2">
              {Array.isArray(prefillValue) ? prefillValue.join(", ") : prefillValue}
            </div>
          )}
        </div>

        {/* Note and Actions */}
        <div className="flex items-center justify-between mt-2">
          {prefillNote && (
            <p className="text-[11px] font-light text-[#C9A84C]/60 font-[DM_Sans] leading-relaxed">
              {prefillNote}
            </p>
          )}

          <div className="flex items-center gap-3">
            {isEditing && !isOverridden && (
              <button
                type="button"
                onClick={handleRevert}
                className="text-[12px] font-medium text-[#f5f0e8]/50 hover:text-[#f5f0e8] transition-colors"
              >
                Revert
              </button>
            )}
            {!isEditing && (
              <button
                type="button"
                onClick={handleEdit}
                className="text-[12px] font-medium text-[#C9A84C] hover:text-[#D4BC6A] transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Legal Confirmation */}
        {requiresConfirmation && confirmationText && !isEditing && (
          <div className="mt-4 pt-4 border-t border-[#C9A84C]/10">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => onConfirmChange?.(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 border border-[#C9A84C]/60 bg-transparent peer-checked:bg-[#C9A84C] transition-colors" />
                {isConfirmed && (
                  <Check className="absolute top-0 left-0 w-4 h-4 text-[#0a0a0a] pointer-events-none" />
                )}
              </div>
              <span className="text-[13px] font-light text-[#f5f0e8]/60 font-[DM_Sans] leading-relaxed group-hover:text-[#f5f0e8]/80 transition-colors">
                {confirmationText}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
