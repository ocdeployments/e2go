import Nav from "@/components/Nav";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
