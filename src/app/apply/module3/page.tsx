"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Module3Page() {
  const router = useRouter();

  useEffect(() => {
    // Redirect /apply/module3 → /apply/module3/a
    router.replace("/apply/module3/a");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
      <div className="text-[#004ac6]">Loading...</div>
    </div>
  );
}
