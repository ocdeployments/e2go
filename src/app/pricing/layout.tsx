import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-2 Visa Application Pricing | e2go.app",
  description: "Transparent pricing for E-2 visa application preparation. Solo from $247, Couple from $297, Family from $347.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
