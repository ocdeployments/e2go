import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Confidence Score | E2go",
  description: "View your E-2 visa application readiness score across 8 dimensions.",
  robots: { index: false, follow: false },
};

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
