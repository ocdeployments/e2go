import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import SectionLayout, { type SectionStep } from "@/components/SectionLayout";

export const metadata: Metadata = {
  title: "Application Workspace | e2go",
  description: "Complete your E-2 visa application package.",
  robots: { index: false, follow: false },
};

async function buildSteps(): Promise<SectionStep[]> {
  const staticSteps: SectionStep[] = [
    { id: "eligibility", label: "Eligibility",  href: "/results",          done: false },
    { id: "onboarding",  label: "Onboarding",   href: "/apply/module1",    done: false },
    { id: "business",    label: "Business",      href: "/apply/business",   done: false },
    { id: "investment",  label: "Investment",    href: "/apply/investment", done: false },
    { id: "gap",         label: "Gap Analysis",  href: "/gap-analysis",     done: false },
    { id: "generate",    label: "Generate",      href: "/apply",            done: false, sublabel: "15 documents" },
    { id: "interview",   label: "Interview",     href: "/simulator",        done: false },
  ];

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return staticSteps;

    // Get primary (non-simulator) application ID for document count
    const { data: allApps } = await supabase
      .from("applications")
      .select("id, source")
      .eq("user_id", user.id);
    const primaryAppId = (allApps ?? []).find(
      (a: { source: string | null }) => a.source !== "simulator_standalone"
    )?.id ?? null;

    const [quizRes, lifecycleRes, simRes, docRes] = await Promise.all([
      supabase
        .from("quiz_sessions")
        .select("completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("application_lifecycle")
        .select("module1_completed_at, module2_completed_at, module3_completed_at, module5_completed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("simulator_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("completed_at", "is", null),
      primaryAppId
        ? supabase
            .from("generated_documents")
            .select("id", { count: "exact", head: true })
            .eq("application_id", primaryAppId)
        : Promise.resolve({ count: 0 }),
    ]);

    const lc = lifecycleRes.data;
    const docCount = (docRes as { count: number | null }).count ?? 0;

    return [
      { id: "eligibility", label: "Eligibility",  href: "/results",          done: Boolean(quizRes.data?.completed_at) },
      { id: "onboarding",  label: "Onboarding",   href: "/apply/module1",    done: Boolean(lc?.module1_completed_at) },
      { id: "business",    label: "Business",      href: "/apply/business",   done: Boolean(lc?.module2_completed_at) },
      { id: "investment",  label: "Investment",    href: "/apply/investment", done: Boolean(lc?.module3_completed_at) },
      { id: "gap",         label: "Gap Analysis",  href: "/gap-analysis",     done: false },
      {
        id: "generate",
        label: "Generate",
        href: "/apply",
        done: docCount >= 15,
        sublabel: docCount > 0 ? `${docCount} / 15 ready` : undefined,
      },
      { id: "interview",   label: "Interview",     href: "/simulator",        done: Boolean((simRes.count ?? 0) > 0) },
    ];
  } catch {
    return staticSteps;
  }
}

export default async function ApplyLayout({ children }: { children: React.ReactNode }) {
  const steps = await buildSteps();
  return <SectionLayout steps={steps}>{children}</SectionLayout>;
}
