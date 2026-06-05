import Link from "next/link";

export default function Simulator() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "500px", width: "100%", padding: "48px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", textAlign: "center" as const }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "64px", color: "#C9A84C", marginBottom: "24px", fontStyle: "italic" }}>Coming Soon</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "16px" }}>Interview Simulator</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.60)", lineHeight: 1.6, marginBottom: "32px" }}>
          Practice your consular interview with an AI-powered simulator. Real questions from real officers. Get feedback on your answers so you walk in prepared.
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(245,240,232,0.40)", marginBottom: "32px" }}>
          Included with your application package. 2 sessions free. Additional sessions available.
        </p>
        <Link href="/dashboard" style={{ color: "#C9A84C", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textDecoration: "underline" }}>
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}