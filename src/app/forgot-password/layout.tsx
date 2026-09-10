import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | E2go.app",
  description: "Reset your E2go.app account password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
