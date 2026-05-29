import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | e2go.app",
  robots: {
    index: false,
    follow: true,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}