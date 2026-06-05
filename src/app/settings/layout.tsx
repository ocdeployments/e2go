import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings | e2go",
  description: "Manage your e2go account settings and preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
