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
    <main className="pt-8 pb-16 px-4 min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />

        <h1 className="text-4xl md:text-5xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontStyle: "italic", color: "#f5f0e8" }}>
          Built for the journey, not just the documents.
        </h1>

        <div className="space-y-12" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.75)", fontWeight: 300, lineHeight: 1.7, fontSize: "15px" }}>
          <section>
            <h2 className="text-2xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>Why e2go exists</h2>
            <p className="mb-4">
              The E-2 visa process is not complicated because the law is complicated. It is complicated because no one has ever organised it properly.
            </p>
            <p className="mb-4">
              The documents exist. The requirements are known. The preparation discipline that separates approved applications from refused ones is learnable.
            </p>
            <p className="font-medium" style={{ color: "#f5f0e8" }}>
              e2go is that discipline, automated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>What we do and do not do</h2>
            <p className="mb-4">
              We prepare documents. What you do with them is up to you.
            </p>
            <p className="mb-4">
              If you choose to have an immigration consultant review your package, it is a 2-hour job — not a 20-hour one.
            </p>
            <p className="mb-4">
              We never store your passports, bank statements, or financial records. Only your answers. Your documents belong to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>The product</h2>
            <p className="mb-4">
              e2go prepares a complete, consulate-formatted E-2 application package.
            </p>
            <p className="mb-4">
              Every document is tested against 15 real denial patterns. Every fact is cross-checked across all documents. Every package is reviewed and approved by you before it leaves the platform.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
          <p className="text-lg mb-6" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#f5f0e8" }}>
            Check your eligibility — it takes 10 minutes.
          </p>
          <Link
            href="/quiz"
            className="inline-block px-8 py-3 text-center transition-colors duration-200"
            style={{
              background: "#C9A84C",
              color: "#0a0a0a",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: "15px",
            }}
          >
            Check My Eligibility →
          </Link>
        </div>
      </div>
    </main>
  );
}
