import { headers } from "next/headers";
import { notFound } from "next/navigation";

// Test-only trigger for the /documents segment error boundary (RS-9 / Gap
// G-18). Only throws when the Playwright test header is present (see
// playwright.config.ts's extraHTTPHeaders) so this route is a plain 404 for
// everyone else.
export default async function DebugErrorPage() {
  const headerList = await headers();
  if (headerList.get("x-playwright-test") !== "true") {
    notFound();
  }
  throw new Error("Test-triggered error for Playwright error-boundary verification");
}
