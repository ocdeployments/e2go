'use client';

import { useState } from 'react';

interface SectionsLayoutProps {
  children: React.ReactNode;
}

export default function SectionsLayout({ children }: SectionsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      {/* Mobile sidebar toggle */}
      <div
        className="fixed top-0 left-0 z-40 flex h-12 w-full items-center border-b px-4 lg:hidden"
        style={{
          borderColor: 'rgba(201,168,76,0.12)',
          backgroundColor: '#0a0a0a',
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em]"
          style={{ color: 'rgba(245,240,232,0.55)', fontFamily: "'DM Sans', sans-serif" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
          Navigation
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main layout */}
      <div className="flex min-h-screen pt-12 lg:pt-0">
        {/* Sidebar — hidden on mobile unless toggled */}
        <aside
          className={`
            fixed top-12 left-0 z-30 h-[calc(100vh-3rem)] w-[196px] overflow-y-auto border-r
            transition-transform duration-200
            lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:translate-x-0 lg:transition-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{
            borderColor: 'rgba(201,168,76,0.12)',
            backgroundColor: '#0a0a0a',
          }}
        >
          {children && (
            <div className="hidden lg:block">
              {/* Side nav is rendered by child pages via a prop or context */}
            </div>
          )}
        </aside>

        {/* Question panel */}
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
