import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "E2go Pricing — E-2 Visa Application Package",
  description: "Transparent, affordable pricing for your E-2 visa application package. From $550 for solo applicants. 14-day money-back guarantee.",
  openGraph: {
    title: "E2go Pricing — E-2 Visa Application Package",
    description: "Transparent, affordable pricing for your E-2 visa application package. From $550 for solo applicants.",
    type: "website",
    url: "https://e2go.app/pricing",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "E2go Pricing",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
