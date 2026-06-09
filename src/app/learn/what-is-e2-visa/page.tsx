import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "What is the E-2 Treaty Investor Visa? | E2go",
  description: "A plain-language guide to E-2 eligibility, investment requirements, and renewal options.",
  robots: { index: true, follow: true },
};

export default function WhatIsE2Visa() {
  return (
    <main className="pt-8 pb-16 px-4 min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Learn", href: "/learn" }, { label: "What is the E-2 Treaty Investor Visa?" }]} />

        <div className="mb-6">
          <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, color: "rgba(245,240,232,0.40)" }}>
            4 min read
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: "#f5f0e8" }}>
          What is the E-2 Treaty Investor Visa?
        </h1>

        <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.75)", lineHeight: 1.7 }}>
          <p>
            The E-2 Treaty Investor visa is a non-immigrant visa that allows citizens of countries with which the United States maintains a treaty of commerce and navigation to enter and work in the United States based on a substantial investment in a U.S. business.
          </p>
          <p>
            Unlike employment-based immigrant visas, the E-2 does not require a labor certification or a specific educational background. Instead, it hinges on two core pillars: your nationality and your investment.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Who Qualifies?
          </h2>
          <p>
            To qualify, you must be a citizen of one of the 82 treaty countries. Permanent residents or green card holders of treaty countries do not qualify — citizenship is mandatory. The business must be at least 50% owned by nationals of the treaty country.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Investment Requirements
          </h2>
          <p>
            The law requires a &quot;substantial&quot; investment. There is no fixed minimum dollar amount, but the investment must be proportional to the total cost of either purchasing or establishing the enterprise. It must be sufficient to ensure the investor&apos;s financial commitment to the successful operation of the business.
          </p>
          <p>
            The funds must be &quot;at risk&quot; — meaning they are committed to the business and subject to partial or total loss if the business fails. Uncommitted funds held in a bank account do not qualify.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Duration and Renewal
          </h2>
          <p>
            The initial E-2 visa is typically granted for up to five years, or the duration of the specific treaty agreement. However, the visa allows for unlimited two-year extensions, provided the business remains active, compliant, and continues to meet E-2 requirements.
          </p>
          <p>
            It is important to note that the E-2 is a non-immigrant visa. It does not provide a direct path to a green card, though many investors eventually transition to EB-5 or other immigrant categories if their business grows significantly.
          </p>
        </div>

        <div className="mt-12 pt-8" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
          <h3 className="text-xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#f5f0e8" }}>
            Related Articles
          </h3>
          <ul className="space-y-2 mb-8">
            <li><Link href="/learn/how-much-to-invest-e2" className="text-[#C9A84C] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>How Much Do You Need to Invest for an E-2 Visa?</Link></li>
            <li><Link href="/learn/e2-visa-denial-reasons" className="text-[#C9A84C] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>Why E-2 Visa Applications Get Denied</Link></li>
          </ul>
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
            Check your eligibility →
          </Link>
        </div>
      </div>
    </main>
  );
}
