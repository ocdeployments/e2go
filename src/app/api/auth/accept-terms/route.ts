import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-service";
import { Redis } from "@upstash/redis";
import { captureApiError } from "@/lib/capture-error";

const TERMS_VERSION = "1.0";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

export async function POST(req: NextRequest) {
  // Get the authenticated user via session cookie
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role to insert acceptance record (bypasses RLS)
  const serviceClient = createServiceClient();

  const { error } = await serviceClient.from("terms_acceptance").upsert(
    {
      user_id: user.id,
      terms_version: TERMS_VERSION,
      accepted_at: new Date().toISOString(),
      ip_address:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        null,
      user_agent: req.headers.get("user-agent") || null,
    },
    {
      onConflict: "user_id,terms_version",
    }
  );

  if (error) {
    captureApiError(error, { route: 'auth/accept-terms', userId: user.id });
    return NextResponse.json(
      { error: "Failed to record acceptance" },
      { status: 500 }
    );
  }

  // Warm the middleware terms cache so the user doesn't hit the DB on their next /apply navigation
  if (redis) {
    await redis.set(`mw:terms:${user.id}:${TERMS_VERSION}`, 1, { ex: 1800 });
  }

  return NextResponse.json({ success: true, version: TERMS_VERSION });
}
