import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserEntitlements } from "@/lib/entitlements";
import DashboardClient from "@/components/dashboard/DashboardClient";

// Opt out of RSC router cache — dashboard is user-specific and must never
// serve a stale payload from a previous user's session after account switching.
export const dynamic = 'force-dynamic';

function deriveApplicationLabel(
  dependents: string | undefined,
  applicationTypeFallback: string | null
): string {
  switch (dependents) {
    case "spouse_only":
      return "E-2 Investor with Spouse";
    case "spouse_and_children":
      return "E-2 Investor with Spouse & Dependents";
    case "children_only":
      return "E-2 Investor with Dependent Children";
    case "just_me":
      return "Solo E-2 Investor";
    default:
      break;
  }
  if (applicationTypeFallback) {
    const t = applicationTypeFallback.toLowerCase();
    if (t === "partnership" || t === "spousal_partnership") return "E-2 Partnership Application";
    if (t === "cos") return "Change of Status — E-2";
  }
  return "Solo E-2 Investor";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    redirect('/login');
  }

  const [
    { data: profile },
    { data: quizData },
    { data: allApps },
    { data: cpData },
    entitlements,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", authUser.id).single(),
    supabase
      .from("quiz_sessions")
      .select("id, outcome, application_type, completed_at, result_json")
      .eq("user_id", authUser.id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("source, simulator_sessions_used, simulator_sessions_purchased")
      .eq("user_id", authUser.id),
    supabase
      .from("case_profiles")
      .select("archetype, completeness_score, net_worth_range, industry_interest, timeline_goal, data_state")
      .eq("user_id", authUser.id)
      .maybeSingle(),
    getUserEntitlements(authUser.id, supabase),
  ]);

  let lifecycle: Record<string, string | null> | null = null;

  if (quizData) {
    const [{ data: life }] = await Promise.all([
      supabase
        .from("application_lifecycle")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle(),
    ]);
    lifecycle = life;
  }

  const isSimulatorOnly = Boolean(
    allApps && allApps.length > 0 && allApps.every((a: { source: string | null }) => a.source === "simulator_standalone")
  );

  const simulatorData =
    isSimulatorOnly && allApps
      ? allApps.reduce(
          (acc: { sessionsUsed: number; sessionsPurchased: number }, a: { simulator_sessions_used: number | null; simulator_sessions_purchased: number | null }) => ({
            sessionsUsed: acc.sessionsUsed + (a.simulator_sessions_used || 0),
            sessionsPurchased: acc.sessionsPurchased + (a.simulator_sessions_purchased || 0),
          }),
          { sessionsUsed: 0, sessionsPurchased: 0 }
        )
      : null;

  let progress = 0;
  {
    let completed = 0;
    const total = 6;
    if (quizData?.completed_at) completed++;
    if (lifecycle?.module1_completed_at) completed++;
    if (lifecycle?.module2_completed_at) completed++;
    if (lifecycle?.module3_completed_at) completed++;
    if (lifecycle?.module4_completed_at) completed++;
    if (lifecycle?.module5_completed_at) completed++;
    progress = Math.round((completed / total) * 100);
  }

  const user = profile as {
    email?: string;
    first_name?: string;
    last_name?: string;
    tier?: string;
  } | null;

  const quiz = quizData as {
    id: string;
    outcome: string;
    application_type: string | null;
    completed_at: string;
    result_json?: {
      answers?: Record<string, string>;
      warnings?: string[];
      dependents?: string;
      investment_range?: string;
    } | null;
  } | null;

  const caseProfile = cpData as {
    archetype?: string | null;
    completeness_score?: number | null;
  } | null;

  const quizAnswers: Record<string, string> = (quiz?.result_json?.answers ?? {}) as Record<string, string>;
  const quizWarnings: string[] = quiz?.result_json?.warnings ?? [];
  const dependents = quiz?.result_json?.dependents;
  const investmentRange = quiz?.result_json?.investment_range ?? (quizAnswers["Q0-07"] as string | undefined) ?? null;

  const showFranchiseNavigator =
    quizAnswers['Q0-08'] === 'I am still searching — I have not chosen yet' ||
    quizAnswers['Q0-08b'] === 'Yes — please connect me';

  const applicationLabel = quiz
    ? deriveApplicationLabel(dependents, quiz.application_type)
    : null;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <main className="pt-20 pb-20 px-4 md:px-8 max-w-5xl mx-auto">
        <DashboardClient
          firstName={user?.first_name ?? null}
          applicationLabel={applicationLabel}
          tier={user?.tier ?? null}
          progress={progress}
          quizCompleted={Boolean(quiz?.completed_at)}
          quizOutcome={quiz?.outcome ?? null}
          quizAnswers={quizAnswers}
          quizWarnings={quizWarnings}
          investmentRange={investmentRange}
          caseArchetype={caseProfile?.archetype ?? null}
          caseCompletenessScore={caseProfile?.completeness_score ?? null}
          lifecycle={lifecycle}
          entitlements={{
            hasComplete: entitlements.hasComplete,
            hasFdd: entitlements.hasFddIntelligence,
          }}
          showFranchiseNavigator={showFranchiseNavigator}
          isSimulatorOnly={isSimulatorOnly}
          simulatorData={simulatorData}
        />
      </main>
    </div>
  );
}
