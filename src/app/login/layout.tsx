import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | E2go.app",
  description: "Sign in to your E2go.app account to continue your E-2 visa application.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
