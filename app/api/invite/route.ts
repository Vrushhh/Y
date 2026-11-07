import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SITE_URL, SUPABASE_URL, isSupabaseConfigured } from "@/lib/config";

/**
 * Invites the second person. The invite row is created through create_invite() with the caller's own
 * session (RLS + function checks enforce "member of a universe with fewer than two people").
 * The service-role key is used server-side only to send the email.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { error } = await supabase.rpc("create_invite", { p_email: email });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({
      ok: true, emailSent: false,
      message: "Invite saved. Email sending isn’t configured, so add them in Supabase → Authentication → Users → Invite user. They’ll join automatically on first sign-in."
    });
  }
  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/auth/callback?next=/settings` });
  if (inviteError && !/already/i.test(inviteError.message)) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true, emailSent: !inviteError,
    message: inviteError ? "They already have an account. They’ll join your universe the next time they sign in." : "Invitation sent. They’ll join your universe when they accept it."
  });
}
