import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "The E-2 Visa for Canadian Citizens | e2go",
  description: "Toronto consulate process, typical wait times, Canadian investment structures, and RRSP considerations.",
  robots: { index: true, follow: true },
};

export default function E2VisaCanada() {
  return (
    <main className="pt-8 pb-16 px-4 min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Learn", href: "/learn" }, { label: "The E-2 Visa for Canadian Citizens" }]} />

        <div className="mb-6">
          <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, color: "rgba(245,240,232,0.40)" }}>
            5 min read
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: "#f5f0e8" }}>
          The E-2 Visa for Canadian Citizens
        </h1>

        <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.75)", lineHeight: 1.7 }}>
          <p>
            Canada is one of the original E-2 treaty countries, making Canadian citizens highly eligible for the Treaty Investor visa. Many Canadians leverage the E-2 to expand their businesses into the United States or launch new ventures south of the border.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            The Toronto Consulate Process
          </h2>
          <p>
            Canadian citizens can apply for an E-2 visa directly at a U.S. consulate, such as the U.S. Consulate General in Toronto. Unlike many other nationalities, Canadians do not need to go through the National Visa Center (NVC) or wait for a petition approval from USCIS. You can schedule an interview directly after preparing your application package.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Typical Wait Times
          </h2>
          <p>
            Wait times for interview appointments at the Toronto consulate can vary significantly based on seasonal demand. Currently, applicants should expect to wait anywhere from a few weeks to a couple of months to secure an appointment. Expedited appointments are rarely granted for E-2 visas unless there is a documented medical or humanitarian emergency.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            Canadian Investment Structures
          </h2>
          <p>
            Canadians often use a Canadian corporation to own the U.S. entity. This is perfectly acceptable under E-2 regulations, provided that the Canadian corporation is at least 50% owned by Canadian citizens. The U.S. entity is typically formed as an LLC or C-Corporation in the state where the business will operate.
          </p>

          <h2 className="text-2xl mt-8 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#C9A84C" }}>
            RRSP Considerations
          </h2>
          <p>
            Using funds from a Canadian Registered Retirement Savings Plan (RRSP) to fund an E-2 investment is possible, but it requires careful structuring. The funds must be fully withdrawn and at risk in the U.S. business. Because RRSP withdrawals are taxable in Canada, applicants should consult a cross-border tax professional before liquidating retirement assets for an E-2 investment.
          </p>
        </div>

        <div className="mt-12 pt-8" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
          <h3 className="text-xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "#f5f0e8" }}>
            Related Articles
          </h3>
          <ul className="space-y-2 mb-8">
            <li><Link href="/learn/what-is-e2-visa" className="text-[#C9A84C] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>What is the E-2 Treaty Investor Visa?</Link></li>
            <li><Link href="/learn/toronto-consulate-e2" className="text-[#C9A84C] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>The E-2 Visa Interview at Toronto Consulate</Link></li>
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
