import type { Metadata } from "next";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service | e2go",
  description: "e2go Terms of Service. Read our terms regarding the use of our E-2 visa preparation platform, subscriptions, and legal disclaimers.",
  openGraph: {
    title: "Terms of Service | e2go",
    description: "e2go Terms of Service. Read our terms regarding the use of our E-2 visa preparation platform.",
    type: "website",
    url: "https://e2go.app/terms",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "e2go Terms of Service",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return <TermsClient />;
}
