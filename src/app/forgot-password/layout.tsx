import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | e2go",
  description: "Reset your e2go account password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
