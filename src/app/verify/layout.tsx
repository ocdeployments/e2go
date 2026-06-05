import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | e2go",
  description: "Verify your email address to access your e2go account.",
  robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
