import type { Metadata } from 'next';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Gap Analysis | E2go',
  description: 'Identify gaps in your E-2 visa case and get targeted recommendations.',
  robots: { index: false, follow: false },
};

export default function GapAnalysisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
