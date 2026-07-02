import type { Metadata } from 'next';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Market Analysis | e2go',
  description: 'Territory market analysis for your E-2 business — live Census demographics, competitor density, and a five-dimension market score.',
  robots: { index: false, follow: false },
};

export default function MarketAnalysisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
