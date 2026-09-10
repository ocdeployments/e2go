import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | E2go.app",
  description: "Verify your email address to access your E2go.app account.",
  robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
