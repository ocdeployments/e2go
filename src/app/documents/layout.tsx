import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Documents | e2go",
  description: "Review and download your generated E-2 visa application documents.",
  robots: { index: false, follow: false },
};

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
