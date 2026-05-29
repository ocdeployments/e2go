import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { callAI } from "@/lib/ai";
import { Redis } from "@upstash/redis";

const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60;

// Initialize Redis client (fail open if unavailable)
let redis: Redis | null = null;

function getRateLimitKey(userId: string): string {
  return `ai:ratelimit:${userId}`;
}

async function checkRateLimitWithRedis(userId: string): Promise<boolean> {
  const key = getRateLimitKey(userId);

  try {
    if (!redis) {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!redisUrl || !redisToken) {
        console.log("[AI] Redis not configured, failing open");
        return true;
      }

      redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
    }

    // Increment counter and set expiry atomically
    const count = await redis.incr(key);

    if (count === 1) {
      // First request, set expiry
      await redis.expire(key, RATE_WINDOW_SECONDS);
    }

    return count <= RATE_LIMIT;
  } catch (error) {
    // Fail open - allow request if Redis fails
    console.error("[AI] Redis rate limit check failed, failing open:", error);
    return true;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Create server-side Supabase client to verify authentication
    const supabase = await createSupabaseServerClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check rate limit with Redis
    const allowed = await checkRateLimitWithRedis(userId);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 requests per minute." },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { systemPrompt, userPrompt, system, prompt } = body;

    // Support both parameter formats for backwards compatibility
    const finalSystemPrompt = systemPrompt || system || "You are a helpful assistant.";
    const finalUserPrompt = userPrompt || prompt;

    if (!finalUserPrompt) {
      return NextResponse.json(
        { error: "userPrompt (or prompt) is required" },
        { status: 400 }
      );
    }

    const result = await callAI({
      systemPrompt: finalSystemPrompt,
      userPrompt: finalUserPrompt,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: result.response,
      tokens_used: result.tokens_used,
    });
  } catch (error) {
    console.error("AI API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}