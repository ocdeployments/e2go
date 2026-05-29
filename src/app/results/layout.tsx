import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-2 Visa Eligibility Results | e2go.app",
  description: "Your E-2 visa eligibility assessment results.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
