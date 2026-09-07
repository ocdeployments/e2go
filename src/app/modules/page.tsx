import { redirect } from "next/navigation";

// This page described the old à-la-carte module pricing (Complete package,
// standalone FDD/Market Analysis purchases) that was retired when packaging
// moved to Foundation/Investor Ready/Interview Ready/Visa Ready. The tiers
// and prices it referenced no longer exist as live Stripe objects.
export default function ModulesPage() {
  redirect("/pricing");
}
