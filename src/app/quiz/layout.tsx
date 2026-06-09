import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-2 Visa Eligibility Quiz | E2go",
  description: "Check your E-2 visa eligibility in 10 minutes. Free, no account required.",
  robots: { index: false, follow: false },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
