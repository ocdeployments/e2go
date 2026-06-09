import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | E2go",
  description: "Create your E2go account to start preparing your E-2 visa application.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
