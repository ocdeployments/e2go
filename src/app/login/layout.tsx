import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | e2go",
  description: "Sign in to your e2go account to continue your E-2 visa application.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
