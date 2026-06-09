import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy | E2go",
  description: "E2go Privacy Policy — Learn how we collect, use, store, and protect your information. Compliant with PIPEDA and Canadian privacy laws.",
  openGraph: {
    title: "Privacy Policy | E2go",
    description: "E2go Privacy Policy — Learn how we collect, use, store, and protect your information.",
    type: "website",
    url: "https://e2go.app/privacy",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "E2go Privacy Policy",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
