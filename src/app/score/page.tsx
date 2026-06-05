import { AlertTriangle, Info } from "lucide-react";
import { getConfidenceScoreData, type ScoreData } from "@/lib/score-sync";

// In a real app, this would come from the current user's session/application ID
const MOCK_APP_ID = "test-app-123";

export default async function ConfidenceScorePage() {
  let scoreData: ScoreData | null = null;

  try {
    scoreData = await getConfidenceScoreData(MOCK_APP_ID);
  } catch {
    // Handle errors gracefully
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Not yet assessed";
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!scoreData || scoreData.dimensions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] font-[DM_Sans] flex flex-col items-center justify-center p-8">
        <Info className="w-12 h-12 text-[#C9A84C] mb-4" />
        <h2 className="text-2xl font-medium mb-2">Not yet assessed</h2>
        <p className="text-[#f5f0e8]/70 text-center max-w-md">
          Complete Module 3 to generate your initial confidence score and case assessment.
        </p>
      </div>
    );
  }

  const hasUnreviewedChanges = scoreData.hasUnreviewedChanges;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] font-[DM_Sans] p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-medium mb-2">Case Confidence Score</h1>
          <p className="text-[#f5f0e8]/60">
            Last assessed: {formatDate(scoreData.lastAssessedAt)}
          </p>
        </div>

        {/* Significant Change Banner */}
        {hasUnreviewedChanges && (
          <div
            className="p-4 flex items-start gap-3"
            style={{
              background: "rgba(201,168,76,0.06)",
              borderLeft: "2px solid #C9A84C",
            }}
          >
            <AlertTriangle className="w-5 h-5 text-[#C9A84C] mt-0.5 flex-shrink-0" />
            <div className="flex-grow">
              <p className="text-sm font-medium mb-1">
                Your assessment has been updated based on recent changes to your application.
                1 dimension changed significantly.
              </p>
              <details className="mt-2 text-xs text-[#f5f0e8]/70 space-y-1">
                <summary className="cursor-pointer text-[#C9A84C] hover:text-[#d4b35a] transition-colors">
                  View changes
                </summary>
                <p className="mt-2">• Investment Substantiality: ADEQUATE → STRONG (+30 points)</p>
              </details>
              <button className="mt-3 px-3 py-1.5 text-xs bg-[#C9A84C] text-[#0a0a0a] font-medium hover:bg-[#d4b35a] transition-colors">
                Mark as reviewed
              </button>
            </div>
          </div>
        )}

        {/* Overall Score */}
        <div className="p-8 border border-[#C9A84C]/20 bg-[#0a0a0a] text-center">
          <div className="text-6xl font-medium text-[#C9A84C] mb-2">{scoreData.overallScore}</div>
          <div className="text-sm text-[#f5f0e8]/60 uppercase tracking-wider">Overall Confidence</div>
        </div>

        {/* Dimensions */}
        <div className="border border-[#C9A84C]/20 bg-[#0a0a0a] divide-y divide-[#C9A84C]/10">
          {scoreData.dimensions.map((dim) => (
            <div key={dim.name} className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-medium">{dim.name}</h3>
                <span
                  className={`px-2 py-1 text-xs font-semibold uppercase tracking-wider ${
                    dim.score === "STRONG"
                      ? "bg-[#C9A84C]/20 text-[#C9A84C]"
                      : dim.score === "ADEQUATE"
                      ? "bg-[#C9A84C]/10 text-[#C9A84C]/80"
                      : "bg-[#f59e0b]/10 text-[#f59e0b]"
                  }`}
                >
                  {dim.score}
                </span>
              </div>
              <p className="text-sm text-[#f5f0e8]/60">{dim.description}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-[#f5f0e8]/50 font-[DM_Sans] font-light text-center pt-4">
          This reflects the completeness of your preparation — not a legal determination of your eligibility.
        </p>
      </div>
    </div>
  );
}
