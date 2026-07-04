'use client';

import Link from 'next/link';
import type { SectionStatus } from '@/app/api/apply/section-completion/route';

interface TriageSectionRowProps {
  label: string;
  description: string;
  href: string;
  status: SectionStatus;
  badge?: string;
}

const STATUS_STYLES: Record<SectionStatus, { dot: string; text: string; label: string }> = {
  complete: { dot: 'bg-[#4ADE80]', text: 'text-[#4ADE80]', label: 'Complete' },
  partial: { dot: 'bg-[#C9A84C]', text: 'text-[#C9A84C]', label: 'In progress' },
  none: { dot: 'bg-[rgba(245,240,232,0.25)]', text: 'text-[#f5f0e8]/40', label: 'Not started' },
};

export default function TriageSectionRow({ label, description, href, status, badge }: TriageSectionRowProps) {
  const style = STATUS_STYLES[status];
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-6 p-5 md:p-6 border border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)] hover:bg-[rgba(201,168,76,0.03)] transition-all duration-200 group"
    >
      <div>
        <div className="text-[16px] font-medium text-[#f5f0e8] mb-1 flex items-center gap-2">
          {label}
          {badge && (
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#C9A84C] border border-[rgba(201,168,76,0.4)] px-1.5 py-0.5">
              {badge}
            </span>
          )}
        </div>
        <div className="text-[13px] text-[#f5f0e8]/50">{description}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-[11px] uppercase tracking-[0.1em] ${style.text}`}>{style.label}</span>
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <span className="text-[#C9A84C] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
      </div>
    </Link>
  );
}
