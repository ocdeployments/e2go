"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      <header className="sticky top-0 z-50" style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex justify-between items-center h-16 px-4 max-w-4xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              e2go<span style={{ color: "#f5f0e8" }}>.app</span>
            </span>
          </Link>
          <Link href="/" style={{ color: "rgba(245,240,232,0.7)", fontSize: "14px", textDecoration: "none" }}>
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-12 max-w-3xl mx-auto w-full">
        <h1 className="text-4xl font-light mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 300 }}>
          Privacy Policy
        </h1>
        <p className="mb-8" style={{ fontSize: "14px", color: "rgba(245,240,232,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
          Last updated: June 2026
        </p>

        <div style={{ color: "rgba(245,240,232,0.75)", fontFamily: "'DM Sans', sans-serif", fontWeight: 300, lineHeight: 1.7, fontSize: "15px" }}>
          <p className="mb-6">
            E2Pathway Inc. (&apos;Company&apos;, &apos;we&apos;, &apos;us&apos;, &apos;our&apos;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share information when you use the e2go application (&apos;App&apos;).
          </p>
          <p className="mb-6">
            This policy is designed to comply with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable Canadian provincial privacy laws.
          </p>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>1. INFORMATION WE COLLECT</h2>
          <h3 className="text-lg mb-2 mt-4 font-medium" style={{ color: "#f5f0e8" }}>Information You Provide Directly</h3>
          <p className="mb-4">During registration and use of the App, we collect:</p>
          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li><strong>Account Information:</strong> Full legal name, email address, password (stored as a hashed value — never in plain text), province of residence.</li>
            <li><strong>Application Data:</strong> Date of birth, passport number (stored encrypted; displayed as last 4 digits only), passport expiry date, home address, phone number, employment history, education history, business information, investment amounts and fund source descriptions, financial institution names and partial account references, family and dependent information, social media handles, interview date and outcome.</li>
            <li><strong>Payment Information:</strong> Payment processing is handled by Stripe. e2go does not store full card numbers, CVC codes, or bank account details. We receive only a tokenized payment reference from Stripe.</li>
          </ul>

          <h3 className="text-lg mb-2 mt-4 font-medium" style={{ color: "#f5f0e8" }}>Information Collected Automatically</h3>
          <p className="mb-4">When you use the App, we automatically collect device type and operating system, browser type and version, IP address, pages and features accessed, time and duration of sessions, and error logs. This data is used for security, analytics, and product improvement only.</p>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>2. HOW WE USE YOUR INFORMATION</h2>
          <p className="mb-4">We use your information for the following purposes:</p>
          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li>To provide the service: generating documents, assessments, calendars, and interview preparation materials personalized to your application.</li>
            <li>To communicate with you: sending compliance calendar reminders, outcome follow-up messages, and account-related communications.</li>
            <li>To improve the App: using anonymized, aggregated usage data and outcome data to improve question quality, scoring accuracy, and document templates.</li>
            <li>To process payments: verifying and processing subscription payments via Stripe.</li>
            <li>For referrals (only with your explicit consent): sharing specific profile fields with third-party professionals you have consented to be connected with.</li>
            <li>For legal and compliance purposes: meeting our legal obligations and enforcing our Terms of Service.</li>
          </ul>
          <p className="mb-6 font-medium">We do not sell your personal information to any third party.</p>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>3. HOW WE STORE AND PROTECT YOUR INFORMATION</h2>
          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li><strong>Encryption:</strong> All data is transmitted over HTTPS/TLS. Sensitive fields (passport number, partial account references) are encrypted at rest using AES-256 encryption.</li>
            <li><strong>Access Controls:</strong> Access to user data is restricted to authorized personnel on a need-to-know basis. Access is logged and audited.</li>
            <li><strong>Storage Location:</strong> User data is stored on servers located in Canada or the United States.</li>
            <li><strong>Retention:</strong> Application data is retained until 90 days after your visa outcome is confirmed, then permanently deleted. Minimal compliance calendar data (email, visa dates, business name) is retained for compliance calendar subscribers only. You may request deletion at any time.</li>
            <li><strong>Third-Party Processors:</strong> Cloud hosting, payment processing (Stripe), email delivery, analytics (anonymized), and document generation (LLM API providers — inputs are processed in-memory and not retained beyond the API call).</li>
          </ul>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>4. SENSITIVE INFORMATION</h2>
          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li><strong>Passport Data:</strong> Stored encrypted. Never shared with third parties except as explicitly authorized by you.</li>
            <li><strong>Financial Information:</strong> Fund source descriptions and account names are stored as application data. Partial account references only (last 4 digits). Full account numbers are never entered or stored.</li>
            <li><strong>Immigration History:</strong> Prior visa denials, overstays, and criminal disclosures are stored as structured flags only.</li>
            <li><strong>Family Information:</strong> Dependent data is collected only as necessary for application generation and is subject to the same protections as applicant data.</li>
          </ul>
          <p className="mb-4">No biometric data is collected. No government documents are uploaded or stored on our servers.</p>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>5. SHARING YOUR INFORMATION</h2>
          <p className="mb-4">We do not share your personal information except in the following cases:</p>
          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li>With your explicit consent (referrals).</li>
            <li>With vetted third-party service providers who perform services on our behalf under data processing agreements.</li>
            <li>Legal requirements: if required by law, court order, or governmental authority.</li>
            <li>Business transfers: in the event of a merger, acquisition, or sale, user data may be transferred to the successor entity.</li>
            <li>Aggregated statistics: anonymized, de-identified outcome and usage statistics may be published publicly.</li>
          </ul>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>6. COOKIES AND TRACKING</h2>
          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li><strong>Essential Cookies:</strong> Required for session management and security. These cannot be disabled.</li>
            <li><strong>Analytics (anonymized):</strong> We use PostHog with IP anonymization and no cross-site tracking. No third-party advertising pixels are used.</li>
          </ul>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>7. YOUR RIGHTS (PIPEDA)</h2>
          <p className="mb-4">Under PIPEDA and applicable provincial privacy laws, you have the right to:</p>
          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li>Access: Request a copy of the personal information we hold about you.</li>
            <li>Correction: Request correction of inaccurate personal information.</li>
            <li>Deletion: Request deletion of your personal information.</li>
            <li>Withdrawal of Consent: Withdraw consent for any purpose where consent was the basis for processing.</li>
            <li>Complaint: Lodge a complaint with the Office of the Privacy Commissioner of Canada.</li>
          </ul>
          <p className="mb-4">To exercise these rights, contact: privacy@e2go.app. We will respond to all privacy requests within 30 days.</p>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>8. CHILDREN&apos;S PRIVACY</h2>
          <p className="mb-4">The App is not directed at children under 18. We do not knowingly collect personal information from anyone under 18 years of age. Dependent children&apos;s information is collected as part of the application data for adult applicants and is governed by their consent.</p>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>9. CHANGES TO THIS POLICY</h2>
          <p className="mb-4">We may update this Privacy Policy from time to time. Material changes will be communicated via email or in-app notification. Continued use after any update constitutes acceptance of the revised policy.</p>

          <h2 className="text-2xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontWeight: 400 }}>10. CONTACT</h2>
          <p className="mb-4">For privacy-related inquiries: privacy@e2go.app<br />For general support: support@e2go.app</p>
        </div>

        <div className="mt-12 pt-8" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
          <Link href="/" style={{ color: "#C9A84C", fontSize: "14px", textDecoration: "none" }}>
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}