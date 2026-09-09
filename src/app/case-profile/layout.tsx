import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "My Case | e2go",
  description: "Your complete E-2 case record — investor profile, business details, investment, and intelligence.",
  robots: { index: false, follow: false },
};

export default function CaseProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
