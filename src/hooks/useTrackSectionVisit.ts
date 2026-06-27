import { useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

/**
 * Tracks which case file section the user is currently viewing.
 * Used for smart post-login routing — if the user returns,
 * they resume where they left off.
 *
 * Call from each section page's useEffect:
 *   useTrackSectionVisit("story");
 */
export function useTrackSectionVisit(sectionName: string) {
  useEffect(() => {
    const track = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from("application_lifecycle")
          .upsert(
            {
              user_id: user.id,
              last_visited_section: sectionName,
            },
            { onConflict: "user_id" }
          );
      } catch {
        // Non-critical — silently ignore
      }
    };

    track();
  }, [sectionName]);
}
