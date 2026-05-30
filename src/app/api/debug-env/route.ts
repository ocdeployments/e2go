import { NextResponse } from "next/server";

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "present" : "missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "present" : "missing",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "present" : "missing",
    MINIMAX_MODEL: process.env.MINIMAX_MODEL ? "present" : "default",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? "present" : "default",
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json({
    message: "Environment variables status (values not shown for security)",
    env: envStatus,
  });
}