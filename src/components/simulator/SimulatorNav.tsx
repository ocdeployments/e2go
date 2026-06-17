'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SIMULATOR_SECTIONS = [
  { label: 'Practice', href: '/simulator', exact: true },
  { label: 'Quick Start', href: '/simulator/quick-start', exact: false },
  { label: 'Case File', href: '/simulator/case-file', exact: false },
  { label: 'Interview Day', href: '/simulator/interview-day', exact: false },
  { label: 'My Outcome', href: '/simulator/outcome', exact: false },
];

export default function SimulatorNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        background: 'rgba(10,10,10,0.98)',
        position: 'sticky',
        top: '64px',
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* Section label */}
        <span
          style={{
            fontSize: '9px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.4)',
            fontFamily: "'DM Sans', sans-serif",
            marginRight: '20px',
            flexShrink: 0,
          }}
        >
          Simulator
        </span>

        {SIMULATOR_SECTIONS.map((section) => {
          const active = isActive(section.href, section.exact);
          return (
            <Link
              key={section.href}
              href={section.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 16px',
                fontSize: '12px',
                fontFamily: "'DM Sans', sans-serif",
                color: active ? '#C9A84C' : 'rgba(245,240,232,0.5)',
                textDecoration: 'none',
                borderBottom: active
                  ? '2px solid #C9A84C'
                  : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'color 0.15s, border-color 0.15s',
                flexShrink: 0,
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,240,232,0.8)';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,240,232,0.5)';
              }}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
