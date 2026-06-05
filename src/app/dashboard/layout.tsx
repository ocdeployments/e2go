import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | e2go",
  description: "Your e2go dashboard. Track your E-2 visa application progress.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}