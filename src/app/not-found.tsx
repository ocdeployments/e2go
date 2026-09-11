import type { Metadata } from "next";
import BrandedMessagePage from "@/components/ui/BrandedMessagePage";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <BrandedMessagePage
      heading="Page not found"
      description="The page you're looking for doesn't exist or may have moved."
      primaryAction={{ label: "Return to dashboard", href: "/dashboard" }}
      secondaryAction={{ label: "Contact support", href: "mailto:support@e2go.app" }}
    />
  );
}
