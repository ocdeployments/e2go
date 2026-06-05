"use client";

import { Check } from "lucide-react";
import { BorderRotate } from "@/components/ui/animated-gradient-border";

interface PricingCardProps {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  isHighlighted?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  disabledText?: string;
  onSelect: (id: string) => void;
}

export default function PricingCard({
  id,
  name,
  price,
  description,
  features,
  isHighlighted = false,
  isSelected = false,
  disabled = false,
  disabledText = "Coming soon",
  onSelect,
}: PricingCardProps) {
  const cardContent = (
    <div className="relative flex flex-col h-full p-8 bg-[#0a0a0a] border border-[rgba(201,168,76,0.15)]">
      {(isHighlighted || isSelected) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#C9A84C] text-[#0a0a0a] text-xs font-medium font-[DM_Sans] tracking-wide uppercase">
          {isSelected ? "Selected plan" : "Your plan — based on your eligibility check"}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl italic font-serif text-[#f5f0e8] mb-2">{name}</h3>
        <p className="text-[rgba(245,240,232,0.60)] text-sm font-[DM_Sans] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mb-8">
        <span className="text-4xl font-serif text-[#C9A84C]">${price}</span>
      </div>

      <ul className="space-y-4 mb-8 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-[rgba(245,240,232,0.80)] text-sm font-[DM_Sans]">
            <Check className="w-4 h-4 text-[#C9A84C] flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => !disabled && onSelect(id)}
        disabled={disabled}
        className={`w-full py-4 text-sm font-medium font-[DM_Sans] transition-colors ${
          disabled
            ? "bg-[rgba(201,168,76,0.1)] text-[rgba(201,168,76,0.4)] cursor-not-allowed"
            : isHighlighted || isSelected
              ? "bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#d4b35a]"
              : "bg-transparent border border-[#C9A84C] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.08)]"
        }`}
      >
        {disabled ? disabledText : isSelected ? "Selected" : "Select Plan"}
      </button>
    </div>
  );

  if (isHighlighted && !isSelected) {
    return (
      <BorderRotate
        gradientColors={{ primary: '#8B6914', secondary: '#C9A84C', accent: '#E8D5A3' }}
        animationSpeed={10}
        borderRadius={0}
      >
        {cardContent}
      </BorderRotate>
    );
  }

  return cardContent;
}
