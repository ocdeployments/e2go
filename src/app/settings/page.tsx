import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

export default function SettingsPage() {
  return (
    <main className="pt-8 pb-16 px-4 min-h-screen bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]} />

        <h1 className="text-3xl md:text-4xl font-medium mb-6" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
          Account Settings
        </h1>

        <div className="space-y-6 text-[rgba(245,240,232,0.65)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <p>
            Account settings are currently under development. You will soon be able to manage your email preferences, update your password, and manage your subscription from this page.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/dashboard"
            className="text-sm font-medium px-5 py-2.5 border border-[#C9A84C] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.06)] transition-colors"
            style={{ borderRadius: 0 }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
