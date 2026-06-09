import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "e2go — E-2 Visa Preparation for Canadian Investors",
  description: "Prepare your complete E-2 visa application package without an immigration attorney. All 11 consulate tabs. 82 treaty countries. From $297.",
  openGraph: {
    title: "e2go — E-2 Visa Preparation for Canadian Investors",
    description: "Prepare your complete E-2 visa application package without an immigration attorney. 82 treaty countries.",
    type: "website",
    url: "https://e2go.app/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "e2go — U.S. E-2 Treaty Investor Visa Preparation" }],
  },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return <HomeClient content={null} />;
}