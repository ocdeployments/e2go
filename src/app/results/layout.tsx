import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiz Results | E2go",
  description: "Your E-2 visa eligibility assessment results.",
  robots: { index: false, follow: false },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
