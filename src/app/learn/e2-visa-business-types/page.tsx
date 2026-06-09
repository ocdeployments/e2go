import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "What Businesses Qualify for an E-2 Visa? | E2go",
  description: "Active operating enterprise requirements, disqualifying factors, and franchise vs independent businesses.",
  robots: { index: true, follow: true },
};

export default function E2VisaBusinessTypes() {
  return (
    <main className="pt-8 pb-16 px-4 min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Learn", href: "/learn" }, { label: "What Businesses Qualify" }]} />

        <div className="mb-6">
          <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, color: "rgba(245,240,232,0.40)" }}>
            5 min read
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: "#f5f0e8" }}>
          What Businesses Qualify for an E-2 Visa?
        </h1>

        <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.75)", lineHeight: 1.7 }}>
          <p>
            Not every business venture qualifies for an E-2 visa. The U.S. government requires the enterprise to be a &quot;real and operating&quot; commercial or entrepreneurial undertaking that produces services or goods for profit.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            The Active Operating Enterprise Requirement
          </h2>
          <p>
            The business must be active, meaning it is currently providing goods or services, or it must be in an advanced stage of development where it will imminently begin operations. A business plan detailing future operations is required for start-ups, but speculative or idle investments do not qualify.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            What Disqualifies a Business?
          </h2>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Passive Investments:</strong> Purchasing real estate for rental income, buying stocks, or holding undeveloped land does not qualify. The investor must actively direct and develop the enterprise.</li>
            <li><strong>Marginal Enterprises:</strong> A business is marginal if it does not have the present or future capacity to generate significantly more income than what is needed to support the investor and their family. It must have a meaningful economic impact, typically demonstrated by job creation.</li>
            <li><strong>Illegal Activities:</strong> Any business involved in activities illegal under U.S. federal or state law is automatically disqualified.</li>
          </ul>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Franchise vs. Independent Businesses
          </h2>
          <p>
            Both franchises and independent businesses can qualify for an E-2 visa. Franchises often have the advantage of a proven business model, which can make the business plan more credible to consular officers. However, independent businesses are equally eligible provided they have a solid, well-researched business plan and a clear path to profitability.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Categories That Work Well
          </h2>
          <p>
            Successful E-2 applications frequently involve service-based businesses (consulting, marketing agencies), hospitality ventures (cafes, restaurants, boutique hotels), specialized retail, and certain tech or software businesses. The key is not the industry, but the viability and active nature of the operation.
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
