import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings | E2go",
  description: "Manage your E2go account settings and preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
