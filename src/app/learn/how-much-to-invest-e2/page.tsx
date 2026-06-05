import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "How Much Do You Need to Invest for an E-2 Visa? | e2go",
  description: "The substantiality test explained, the proportionality principle, and typical ranges by business type.",
  robots: { index: true, follow: true },
};

export default function HowMuchToInvest() {
  return (
    <main className="pt-8 pb-16 px-4 min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Learn", href: "/learn" }, { label: "How Much to Invest" }]} />

        <div className="mb-6">
          <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, color: "rgba(245,240,232,0.40)" }}>
            4 min read
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: "#f5f0e8" }}>
          How Much Do You Need to Invest for an E-2 Visa?
        </h1>

        <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.75)", lineHeight: 1.7 }}>
          <p>
            One of the most common questions about the E-2 visa is: &quot;What is the minimum investment amount?&quot; The short answer is that U.S. immigration law does not specify a fixed minimum dollar amount. Instead, it uses the &quot;substantiality&quot; test.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            The Substantiality Test
          </h2>
          <p>
            An investment is considered &quot;substantial&quot; if it is sufficient to ensure the investor&apos;s financial commitment to the successful operation of the enterprise. The investment must be proportional to the total cost of either purchasing an established business or creating a new one.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            The Proportionality Principle
          </h2>
          <p>
            The lower the total cost of the business, the higher the percentage of that cost the investment must represent to be considered substantial. For example, a $50,000 investment in a $60,000 business is highly proportional and likely substantial. However, a $50,000 investment in a $2,000,000 business is unlikely to meet the test, as it represents a tiny fraction of the total cost.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Why $100,000 is Not a Magic Number
          </h2>
          <p>
            Many applicants believe that $100,000 is a safe minimum. While $100,000 to $150,000 is a common and generally safe range for many service-based or consulting businesses, the true requirement depends entirely on the specific business model. A capital-intensive business like a manufacturing plant will require significantly more, while a low-overhead consulting firm might qualify with less, provided the business plan justifies the lower amount.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Typical Ranges by Business Type
          </h2>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Service/Consulting:</strong> $75,000 – $120,000</li>
            <li><strong>Retail / Franchise:</strong> $150,000 – $300,000+</li>
            <li><strong>Manufacturing / Tech:</strong> $250,000 – $500,000+</li>
          </ul>
          <p>
            Remember, the funds must be irrevocably committed and &quot;at risk.&quot; Unspent funds sitting in a U.S. bank account do not count toward the substantiality test.
          </p>
        </div>

        <div className="mt-12 pt-8" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
          <h3 className="text-xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#f5f0e8" }}>
            Related Articles
          </h3>
          <ul className="space-y-2 mb-8">
            <li><Link href="/learn/e2-visa-business-types" className="text-[#C9A84C] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>What Businesses Qualify for an E-2 Visa?</Link></li>
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
