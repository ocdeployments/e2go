import Link from "next/link";

export default function Support() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "500px", width: "100%", padding: "48px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", textAlign: "center" as const }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "16px" }}>Support</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.60)", lineHeight: 1.6, marginBottom: "32px" }}>
          Need help with your application? Our support team is here to assist you.
        </p>
        <a
          href="mailto:support@e2go.app"
          style={{ display: "inline-block", padding: "12px 24px", background: "#C9A84C", color: "#0a0a0a", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, textDecoration: "none", marginBottom: "24px" }}
        >
          Email Support →
        </a>
        <br />
        <Link href="/dashboard" style={{ color: "#C9A84C", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textDecoration: "underline" }}>
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}