import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | E2go",
  description: "E2go administrative dashboard.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
