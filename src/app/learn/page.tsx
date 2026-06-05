import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Learn About the E-2 Visa | e2go",
  description: "Comprehensive guide to the E-2 Treaty Investor Visa. Requirements, process, timelines, and how to build a successful application.",
  openGraph: {
    title: "Learn About the E-2 Visa | e2go",
    description: "Comprehensive guide to the E-2 Treaty Investor Visa. Requirements, process, and timelines.",
    type: "website",
    url: "https://e2go.app/learn",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Learn About the E-2 Visa",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Learn() {
  const articles = [
    { title: "What is the E-2 Treaty Investor Visa?", href: "#" },
    { title: "E-2 Investment Requirements", href: "#" },
    { title: "How to Qualify as a Treaty Investor", href: "#" },
    { title: "E-2 vs EB-5: Which is Right for You?", href: "#" },
    { title: "The E-2 Application Process — Step by Step", href: "#" },
    { title: "Common E-2 Denial Reasons", href: "#" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      {/* Nav */}
      <nav style={{ padding: "24px 48px", borderBottom: "1px solid rgba(201,168,76,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, color: "#C9A84C" }}>e2go</span>
        </Link>
        <Link href="/quiz" style={{ background: "#C9A84C", color: "#0a0a0a", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}>
          Check My Eligibility →
        </Link>
      </nav>

      {/* Content */}
      <section style={{ maxWidth: "700px", margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "48px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.1, marginBottom: "16px" }}>
          Learn About the <em style={{ fontStyle: "italic", color: "#C9A84C" }}>E-2 Visa</em>
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 300, color: "rgba(245,240,232,0.60)", lineHeight: 1.6, marginBottom: "48px" }}>
          Everything you need to know about the E-2 Treaty Investor visa — requirements, process, timelines, and how to build a successful application.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.12)" }}>
          {articles.map((article, i) => (
            <Link
              key={i}
              href={article.href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px",
                background: "rgba(201,168,76,0.02)",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: "#f5f0e8", fontWeight: 400 }}>{article.title}</span>
              <span style={{ color: "#C9A84C", fontSize: "18px" }}>→</span>
            </Link>
          ))}
        </div>

        <p style={{ textAlign: "center" as const, marginTop: "48px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(245,240,232,0.40)" }}>
          Full educational content coming soon. In the meantime, take the quiz to check your eligibility.
        </p>
      </section>
    </main>
  );
}