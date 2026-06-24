'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const supabase = createBrowserSupabaseClient();

interface NavSection {
  label: string;
  basePath: string;
  href: string;
  exact: boolean;
}

export default function SimulatorNav() {
  const pathname = usePathname();
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    async function loadApp() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: apps } = await supabase
        .from('applications')
        .select('id, source')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!apps || apps.length === 0) return;

      // Prefer simulator_standalone; fall back to any application
      const simApp = apps.find((a: { id: string; source: string | null }) => a.source === 'simulator_standalone') ?? apps[0];
      setApplicationId(simApp.id);
    }
    loadApp();
  }, []);

  const sections: NavSection[] = [
    {
      label: 'Quick Start',
      basePath: '/simulator/quick-start',
      href: '/simulator/quick-start',
      exact: false,
    },
    {
      label: 'Prepare',
      basePath: '/simulator/case-file',
      href: applicationId
        ? `/simulator/case-file?applicationId=${applicationId}`
        : '/simulator/case-file',
      exact: false,
    },
    {
      label: 'Practice',
      basePath: '/simulator',
      href: '/simulator',
      exact: true,
    },
    {
      label: 'Interview Day',
      basePath: '/simulator/interview-day',
      href: '/simulator/interview-day',
      exact: false,
    },
    {
      label: 'My Outcome',
      basePath: '/simulator/outcome',
      href: '/simulator/outcome',
      exact: false,
    },
  ];

  const isActive = (basePath: string, exact: boolean) =>
    exact ? pathname === basePath : pathname.startsWith(basePath);

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
        <span
          style={{
            fontSize: '9px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.78)',
            fontFamily: "'DM Sans', sans-serif",
            marginRight: '20px',
            flexShrink: 0,
          }}
        >
          Simulator
        </span>

        {sections.map((section) => {
          const active = isActive(section.basePath, section.exact);
          return (
            <Link
              key={section.basePath}
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
                if (!active) (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,240,232,0.76)';
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
