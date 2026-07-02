"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { resolvePrimaryApplicationId } from "@/lib/resolve-application";

export type ApplicationGateStatus = "loading" | "no-user" | "not-ready" | "ready";

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 1500;

/**
 * Resolves the user's primary application id, retrying briefly before giving up.
 * Case-file pages used to render their full form the instant `applications`
 * came back empty — reachable right after checkout, before the Stripe webhook
 * has created the row — so every save silently no-opped with no feedback.
 * This gives the webhook a few seconds to land before surfacing "not-ready".
 */
export function useApplicationGate() {
  const [status, setStatus] = useState<ApplicationGateStatus>("loading");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      setStatus("loading");
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setStatus("no-user");
        return;
      }
      if (!cancelled) setUserId(user.id);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const appId = await resolvePrimaryApplicationId(supabase, user.id);
        if (appId) {
          if (!cancelled) {
            setApplicationId(appId);
            setStatus("ready");
          }
          return;
        }
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
      if (!cancelled) setStatus("not-ready");
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  return { status, applicationId, userId, retry: () => setRetryToken((t) => t + 1) };
}
