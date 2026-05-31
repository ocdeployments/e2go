import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}