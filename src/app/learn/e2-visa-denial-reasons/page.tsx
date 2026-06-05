import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "Why E-2 Visa Applications Get Denied | e2go",
  description: "The 5 most common denial reasons, what consular officers look for, and how preparation affects outcomes.",
  robots: { index: true, follow: true },
};

export default function E2VisaDenialReasons() {
  return (
    <main className="pt-8 pb-16 px-4 min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Learn", href: "/learn" }, { label: "Why Applications Get Denied" }]} />

        <div className="mb-6">
          <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, color: "rgba(245,240,232,0.40)" }}>
            6 min read
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: "#f5f0e8" }}>
          Why E-2 Visa Applications Get Denied
        </h1>

        <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.75)", lineHeight: 1.7 }}>
          <p>
            While the E-2 visa has a high approval rate for well-prepared applications, denials do occur. Understanding the common reasons for refusal can help you build a stronger, more resilient application.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            1. The Investment is Not &quot;Substantial&quot;
          </h2>
          <p>
            The most frequent reason for denial is failing the substantiality test. If the invested amount is too low relative to the total cost of the business, or if the funds are not demonstrably &quot;at risk,&quot; the consular officer will determine the investment is insufficient to ensure the investor&apos;s commitment.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            2. The Business is &quot;Marginal&quot;
          </h2>
          <p>
            A marginal enterprise is one that does not generate enough income to provide more than a minimal living for the investor and their family. The business must have the capacity to create jobs or have a significant economic impact. A one-person consulting business with no realistic job creation plan may be deemed marginal.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            3. Lack of a Clear Source of Funds
          </h2>
          <p>
            You must prove that the investment funds were obtained legally. If the paper trail is unclear, relies heavily on undocumented cash, or shows sudden, unexplained large deposits, the officer will deny the visa due to concerns about the legitimacy of the funds.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            4. Failure to Demonstrate Intent to Depart
          </h2>
          <p>
            The E-2 is a non-immigrant visa. You must maintain a residence abroad that you have no intention of abandoning. Strong ties to your home country — such as property ownership, family, or ongoing business interests — are critical to proving this intent.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            5. Incomplete or Inconsistent Documentation
          </h2>
          <p>
            Inconsistencies between your business plan, financial projections, and supporting documents raise red flags. A well-prepared application ensures every fact is cross-checked and every claim in the business plan is backed by verifiable evidence. This is where thorough preparation makes the difference between approval and denial.
          </p>
        </div>

        <div className="mt-12 pt-8" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
          <h3 className="text-xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#f5f0e8" }}>
            Related Articles
          </h3>
          <ul className="space-y-2 mb-8">
            <li><Link href="/learn/toronto-consulate-e2" className="text-[#C9A84C] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>The E-2 Visa Interview at Toronto Consulate</Link></li>
            <li><Link href="/learn/how-much-to-invest-e2" className="text-[#C9A84C] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>How Much Do You Need to Invest for an E-2 Visa?</Link></li>
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
