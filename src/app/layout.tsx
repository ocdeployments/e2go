import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "600"],
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
    default: "e2go.app - E-2 Visa Application Guide",
    template: "%s | e2go.app",
  },
  description: "Self-service guided application for U.S. E-2 Treaty Investor visa",
  metadataBase: new URL("https://e2go.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "e2go.app",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  themeColor: "#0D9488",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "e2go",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${playfair.variable} ${dmSans.variable} font-sans antialiased`}>
        {/* Flag accent strip */}
        <div className="flag-strip" />

        {/* Global background scene */}
        <div className="bg-scene">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>
        <div className="grid-overlay" />

        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}