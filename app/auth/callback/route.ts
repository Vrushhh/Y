import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

import { safeReturnPath } from "@/lib/return-path";

/** PKCE callback for magic links and password recovery. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeReturnPath(url.searchParams.get("next"));
  if (code) {
    const { error } = await createSupabaseServer().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL(`/login?error=link&next=${encodeURIComponent(next)}`, url.origin));
}
