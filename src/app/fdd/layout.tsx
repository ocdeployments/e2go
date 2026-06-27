import type { Metadata } from 'next';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'FDD Intelligence | e2go',
  description: 'Analyze your Franchise Disclosure Document for E-2 visa compatibility.',
  robots: { index: false, follow: false },
};

export default function FddLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
