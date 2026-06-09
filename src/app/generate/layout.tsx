import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generating Documents | E2go",
  description: "Your E-2 visa documents are being generated.",
  robots: { index: false, follow: false },
};

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
