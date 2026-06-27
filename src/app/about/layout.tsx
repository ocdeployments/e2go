import Nav from "@/components/Nav";

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
