import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview Simulator | E2go",
  description: "Practice your E-2 visa interview with our AI simulator.",
  robots: { index: false, follow: false },
};

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
