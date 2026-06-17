import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SimulatorNav from "@/components/simulator/SimulatorNav";

export const metadata: Metadata = {
  title: "Interview Simulator | E2go",
  description: "Practice your E-2 visa interview with our AI simulator.",
  robots: { index: false, follow: false },
};

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {/* Spacer pushes content below the fixed global Nav (64px) */}
      <div style={{ paddingTop: '64px' }}>
        {/* SimulatorNav: sticky, sticks at top: 64px (just below the fixed Nav) */}
        <SimulatorNav />
        {children}
      </div>
    </>
  );
}
