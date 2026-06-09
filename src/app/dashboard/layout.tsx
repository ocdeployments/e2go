import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | E2go",
  description: "Your E2go dashboard. Track your E-2 visa application progress.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}