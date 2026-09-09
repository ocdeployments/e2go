import CaseProfilePageClassic from "@/components/CaseProfilePageClassic";
import CaseProfileNew from "@/components/casefile/CaseProfileNew";

export default function CaseProfilePage() {
  if (process.env.NEXT_PUBLIC_CASE_PROFILE_CLASSIC === "1") {
    return <CaseProfilePageClassic />;
  }
  return <CaseProfileNew />;
}
