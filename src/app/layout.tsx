import { runStartupSecurityChecks } from '@/lib/security-checks'
runStartupSecurityChecks()

import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import CookieBanner from "@/components/CookieBanner";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "E2go — U.S. E-2 Treaty Investor Visa Preparation",
    template: "%s | E2go",
  },
  description: "Prepare your complete E-2 visa application package. All consulate tabs. 82 treaty countries. From $550.",
  metadataBase: new URL("https://e2go.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "E2go",
    title: "E2go — U.S. E-2 Treaty Investor Visa Preparation",
    description: "Prepare your complete E-2 visa application package. All consulate tabs. 82 treaty countries. From $550.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "E2go — U.S. E-2 Treaty Investor Visa Preparation",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "E2go",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased bg-[#0a0a0a] text-[#f5f0e8]">
        <ServiceWorkerRegistration />
        <main className="min-h-screen">
          {children}
        </main>
        <CookieBanner />
      </body>
    </html>
  );
}
