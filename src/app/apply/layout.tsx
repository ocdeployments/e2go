import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Workspace | E2go",
  description: "Complete your E-2 visa application package.",
  robots: { index: false, follow: false },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
