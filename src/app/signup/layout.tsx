import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | e2go.app",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
