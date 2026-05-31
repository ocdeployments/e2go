'use client';

import Link from 'next/link';

export default function TabIPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
      <header className="w-full sticky top-0 z-50 bg-white border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 max-w-2xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-[#434655] hover:text-[#004ac6]">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">Tab I — Coming Soon</h1>
            <p className="text-[#434655] mb-6">
              This section is currently in development.
            </p>
            <Link
              href="/apply/module3/a"
              className="inline-block px-6 py-3 bg-[#004ac6] text-white rounded-lg font-medium hover:bg-[#00337d] transition-colors"
            >
              Back to Tab A
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-[#737686]">
        e2go.app · The American Dream Edition
      </footer>
    </div>
  );
}
