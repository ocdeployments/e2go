import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0a0a] border-t border-[rgba(201,168,76,0.2)] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
          {/* Column 1 — Product */}
          <div>
            <h3 className="text-[#C9A84C] font-medium uppercase tracking-widest text-xs mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Product
            </h3>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/#how-it-works" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/quiz" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  Eligibility quiz
                </Link>
              </li>
              <li>
                <Link href="/learn" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  Learn
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 — Support */}
          <div>
            <h3 className="text-[#C9A84C] font-medium uppercase tracking-widest text-xs mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Support
            </h3>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/support" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 — Company */}
          <div>
            <h3 className="text-[#C9A84C] font-medium uppercase tracking-widest text-xs mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Company
            </h3>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/about" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[rgba(201,168,76,0.2)] pt-8 text-center">
          <p className="text-xs text-[rgba(245,240,232,0.45)] max-w-2xl mx-auto mb-4 leading-relaxed">
            This tool is a self-service preparation guide and does not constitute legal advice.
            e2go.app is not a law firm and does not provide legal representation or immigration
            services. For legal advice, consult a qualified U.S. immigration attorney.
          </p>
          <p className="text-xs text-[rgba(245,240,232,0.25)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            © {currentYear} e2go.app. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
