import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Franchise Navigator | e2go",
  description: "Match with vetted franchise brands and territories for your E-2 visa case.",
  robots: { index: false, follow: false },
};

export default function FranchiseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div style={{ paddingTop: "64px" }}>{children}</div>
    </>
  );
}
