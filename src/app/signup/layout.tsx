import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | E2go.app",
  description: "Create your E2go.app account to start preparing your E-2 visa application.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
