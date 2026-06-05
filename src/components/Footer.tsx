import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 px-4 bg-[#0b1c30]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-400 mb-4">
            This tool is a self-service preparation guide and does not constitute legal advice.
            e2go.app is not a law firm and does not provide legal representation or immigration
            services. For legal advice, consult a qualified U.S. immigration attorney.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/learn" className="text-sm text-gray-500 hover:text-white transition-colors">
              Learn
            </Link>
            <Link href="/quiz" className="text-sm text-gray-500 hover:text-white transition-colors">
              Eligibility Quiz
            </Link>
            <Link href="/support" className="text-sm text-gray-500 hover:text-white transition-colors">
              Support
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
              Legal Disclaimer
            </Link>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © {currentYear} e2go.app. All rights reserved. Professional E-2 visa self-service for Canadian entrepreneurs.
          </p>
        </div>
      </div>
    </footer>
  );
}
