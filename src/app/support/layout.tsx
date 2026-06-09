import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | E2go",
  description: "Contact E2go support for help with your E-2 visa application.",
  robots: { index: false, follow: false },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
