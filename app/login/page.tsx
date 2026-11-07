"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured, SITE_URL } from "@/lib/config";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { Starfield } from "@/components/Starfield";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/universe";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magic, setMagic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "That link has expired or was already used. Request a new one." : null);
  const [sent, setSent] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <Card className="space-y-4 p-8 text-center">
        <h1 className="font-display text-3xl">Sign-in isn’t set up yet</h1>
        <p className="text-sm text-lilac">Add your Supabase keys to <code>.env.local</code> to turn on private accounts. Until then you can explore in Preview mode.</p>
        <Link href="/universe"><Button className="mt-2">Explore in Preview mode</Button></Link>
      </Card>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const sb = getSupabase()!;
    if (magic) {
      const { error: err } = await sb.auth.signInWithOtp({
        email, options: { shouldCreateUser: false, emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` }
      });
      setBusy(false);
      if (err) setError(err.message); else setSent(true);
      return;
    }
    const { error: err } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError(err.message === "Invalid login credentials" ? "That email and password don’t match." : err.message);
    else { router.replace(next); router.refresh(); }
  };

  return (
    <Card className="p-8">
      <h1 className="font-display text-4xl">Welcome home</h1>
      <p className="mt-2 text-sm text-lilac">This universe is private. Only its two members can sign in.</p>
      {sent ? (
        <p className="mt-6 rounded-2xl bg-cloud/5 p-4 text-sm text-cloud">Check {email} for a sign-in link.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email"><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {!magic && (
            <Field label="Password"><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          )}
          <ErrorNote message={error} />
          <Button type="submit" className="w-full" loading={busy}>{magic ? "Email me a sign-in link" : "Sign in"}</Button>
          <button type="button" className="w-full text-center text-sm text-lilac underline-offset-4 hover:underline" onClick={() => setMagic(!magic)}>
            {magic ? "Use a password instead" : "Sign in with an email link instead"}
          </button>
        </form>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Starfield />
      <div className="w-full max-w-md">
        <Suspense><LoginForm /></Suspense>
      </div>
    </main>
  );
}
