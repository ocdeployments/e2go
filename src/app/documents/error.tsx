"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import BrandedMessagePage from "@/components/ui/BrandedMessagePage";

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <BrandedMessagePage
      heading="Something went wrong"
      description="An unexpected error occurred while loading your documents. Nothing you've generated has been lost — try again, or return to your dashboard."
      primaryAction={{ label: "Return to dashboard", href: "/dashboard" }}
      secondaryAction={{ label: "Contact support", href: "mailto:support@e2go.app" }}
    >
      <button
        onClick={reset}
        className="w-full py-3 font-medium transition-colors mb-3"
        style={{
          background: "transparent",
          color: "#C9A84C",
          border: "1px solid rgba(201,168,76,0.4)",
          borderRadius: 0,
          cursor: "pointer",
          fontSize: "14px",
          letterSpacing: "0.04em",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Try again
      </button>
    </BrandedMessagePage>
  );
}
