import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "About e2go",
  description: "About e2go — Built for the journey, not just the documents. Learn how our E-2 visa preparation platform works.",
  openGraph: {
    title: "About e2go",
    description: "About e2go — Built for the journey, not just the documents.",
    type: "website",
    url: "https://e2go.app/about",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "About e2go",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutPage() {
  return (
    <main className="pt-8 pb-16 px-4 min-h-screen bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />

        <h1 className="text-3xl md:text-4xl font-medium mb-6" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
          About e2go.app
        </h1>

        <div className="space-y-6 text-[rgba(245,240,232,0.65)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <p>
            e2go.app was built to democratize access to the U.S. E-2 Treaty Investor visa. We believe that preparing your application should not require paying $6,500–$15,000 to an immigration consultant.
          </p>
          <p>
            Our platform guides you through the exact same 11-tab structure required by U.S. consulates, using AI to help you draft compelling, consulate-ready documents based on your unique situation.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="text-sm font-medium px-5 py-2.5 border border-[#C9A84C] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.06)] transition-colors"
            style={{ borderRadius: 0 }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
