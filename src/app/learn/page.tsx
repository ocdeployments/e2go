import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "Learn About the E-2 Visa | E2go",
  description: "Comprehensive guide to the E-2 Treaty Investor Visa. Requirements, process, timelines, and how to build a successful application.",
  openGraph: {
    title: "Learn About the E-2 Visa | E2go",
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

const articles = [
  {
    title: "What is the E-2 Treaty Investor Visa?",
    href: "/learn/what-is-e2-visa",
    desc: "A plain-language guide to E-2 eligibility, investment requirements, and renewal options.",
    readTime: "4 min read",
  },
  {
    title: "The E-2 Visa for Canadian Citizens",
    href: "/learn/e2-visa-canada",
    desc: "Toronto consulate process, typical wait times, Canadian investment structures, and RRSP considerations.",
    readTime: "5 min read",
  },
  {
    title: "How Much Do You Need to Invest for an E-2 Visa?",
    href: "/learn/how-much-to-invest-e2",
    desc: "The substantiality test explained, the proportionality principle, and typical ranges by business type.",
    readTime: "4 min read",
  },
  {
    title: "What Businesses Qualify for an E-2 Visa?",
    href: "/learn/e2-visa-business-types",
    desc: "Active operating enterprise requirements, disqualifying factors, and franchise vs independent businesses.",
    readTime: "5 min read",
  },
  {
    title: "Why E-2 Visa Applications Get Denied",
    href: "/learn/e2-visa-denial-reasons",
    desc: "The 5 most common denial reasons, what consular officers look for, and how preparation affects outcomes.",
    readTime: "6 min read",
  },
  {
    title: "The E-2 Visa Interview at Toronto Consulate",
    href: "/learn/toronto-consulate-e2",
    desc: "What to expect, typical questions, required documents, and what happens after the interview.",
    readTime: "5 min read",
  },
];

export default function Learn() {
  return (
    <main className="pt-8 pb-16 px-4 min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-4xl mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Learn" }]} />

        <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: "#f5f0e8" }}>
          Learn About the <em style={{ fontStyle: "italic", color: "#C9A84C" }}>E-2 Visa</em>
        </h1>
        <p className="mb-12" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 300, color: "rgba(245,240,232,0.60)", lineHeight: 1.6 }}>
          Everything you need to know about the E-2 Treaty Investor visa — requirements, process, timelines, and how to build a successful application. Educational resources designed to clarify, not complicate.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article, i) => (
            <Link
              key={i}
              href={article.href}
              className="block p-6 transition-all duration-200 border hover:border-[#C9A84C] hover:bg-[rgba(201,168,76,0.05)]"
              style={{
                border: "1px solid rgba(201,168,76,0.2)",
                background: "rgba(201,168,76,0.02)",
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-xl" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#f5f0e8" }}>
                  {article.title}
                </h2>
              </div>
              <p className="mb-4" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 300, color: "rgba(245,240,232,0.60)", lineHeight: 1.6 }}>
                {article.desc}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, color: "#C9A84C" }}>
                  Read article →
                </span>
                <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, color: "rgba(245,240,232,0.40)" }}>
                  {article.readTime}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 pt-8 text-center" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
          <p className="text-xl mb-6" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#f5f0e8" }}>
            Ready to see where you stand?
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
            Check your eligibility — it takes 10 minutes
          </Link>
        </div>
      </div>
    </main>
  );
}
