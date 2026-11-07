"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { readLocal, removeLocal, writeLocal } from "@/lib/local";
import { Button, Card, ErrorNote, Field, Input, PageHeader } from "@/components/ui";

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span><span className="block text-cloud">{label}</span>{hint && <span className="text-sm text-lilac">{hint}</span>}</span>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-blush" : "bg-cloud/15"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-cloud transition ${checked ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

export default function Settings() {
  const router = useRouter();
  const { mode, me, partner, relationship, email, prefs, setPrefs, refresh, toast, userId } = useApp();
  const [display, setDisplay] = useState("");
  const [relName, setRelName] = useState("");
  const [start, setStart] = useState("");
  const [invite, setInvite] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setDisplay(me?.display_name ?? ""); setRelName(relationship?.name ?? ""); setStart(relationship?.start_date ?? ""); }, [me, relationship]);

  const saveProfile = async () => {
    setBusy("profile"); setError(null);
    if (mode === "preview") {
      writeLocal("members", readLocal("members", [] as { user_id: string; display_name: string }[]).map((m) => m.user_id === userId ? { ...m, display_name: display } : m));
      writeLocal("relationship", { ...relationship, name: relName, start_date: start });
    } else {
      const sb = getSupabase()!;
      const [a, b] = await Promise.all([
        sb.from("relationship_members").update({ display_name: display }).eq("user_id", userId!),
        sb.from("relationships").update({ name: relName, start_date: start }).eq("id", relationship!.id)
      ]);
      const err = a.error ?? b.error;
      if (err) { setError(err.message); setBusy(null); return; }
    }
    await refresh();
    setBusy(null);
    toast("Saved", "success");
  };

  const sendInvite = async () => {
    setBusy("invite"); setInviteMsg(null);
    const res = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: invite }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) toast(data.error ?? "Couldn’t send the invite", "error"); else setInviteMsg(data.message);
  };

  const demo = async (action: "seed" | "clear") => {
    setBusy(action);
    if (mode === "preview") {
      if (action === "clear") {
        for (const t of ["memories", "timeline_events", "reasons", "songs", "bucket_list", "letters"]) {
          writeLocal(t, readLocal<{ is_demo?: boolean }[]>(t, []).filter((r) => !r.is_demo));
        }
      } else { removeLocal("seeded"); await refresh(); }
    } else {
      const { error: err } = await getSupabase()!.rpc(action === "seed" ? "seed_demo_content" : "clear_demo_content");
      if (err) { toast(err.message, "error"); setBusy(null); return; }
    }
    setBusy(null);
    toast(action === "seed" ? "Demo content added" : "Demo content removed", "success");
  };

  const changePassword = async () => {
    if (password.length < 8) return toast("Use at least 8 characters.", "error");
    setBusy("pw");
    const { error: err } = await getSupabase()!.auth.updateUser({ password });
    setBusy(null);
    if (err) toast(err.message, "error"); else { setPassword(""); toast("Password updated", "success"); }
  };

  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle={mode === "supabase" ? `Signed in as ${email}` : "Preview mode: changes are kept in this browser."} />

      <Card className="space-y-4">
        <h2 className="font-display text-2xl">Us</h2>
        <Field label="Your name"><Input value={display} onChange={(e) => setDisplay(e.target.value)} maxLength={40} /></Field>
        <Field label="Our universe is called"><Input value={relName} onChange={(e) => setRelName(e.target.value)} maxLength={80} /></Field>
        <Field label="The day it began" hint="Drives every counter and the anniversary countdown"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <ErrorNote message={error} />
        <Button onClick={saveProfile} loading={busy === "profile"}>Save changes</Button>
      </Card>

      {mode === "supabase" && (
        <Card className="space-y-4">
          <h2 className="font-display text-2xl">Your person</h2>
          {partner ? (
            <p className="text-lilac">{partner.display_name} is here. This universe is complete with two members.</p>
          ) : (
            <>
              <p className="text-sm text-lilac">Invite the one other person who belongs here. They’ll join automatically when they sign in with this email.</p>
              <div className="flex gap-2">
                <Input type="email" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="their@email.com" />
                <Button onClick={sendInvite} loading={busy === "invite"} disabled={!invite}>Invite</Button>
              </div>
              {inviteMsg && <p className="rounded-2xl bg-cloud/5 p-3 text-sm text-cloud">{inviteMsg}</p>}
            </>
          )}
        </Card>
      )}

      <Card className="divide-y divide-lilac/10">
        <h2 className="pb-2 font-display text-2xl">Experience</h2>
        <Toggle label="Animations" hint="Twinkling stars and floating effects. Your device’s reduced-motion setting always wins." checked={prefs.animation_enabled} onChange={(v) => setPrefs({ animation_enabled: v })} />
        <Toggle label="Intro music" hint="Plays only after you tap, and only if a track is added at public/audio/intro.mp3" checked={prefs.music_enabled} onChange={(v) => setPrefs({ music_enabled: v })} />
        <div className="pt-3"><Button variant="ghost" onClick={() => { localStorage.removeItem("olu:intro-done"); router.push("/"); }}>Replay the intro</Button></div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-2xl">Demo content</h2>
        <p className="text-sm text-lilac">Labelled placeholders that keep pages from looking empty. Remove them once your real memories are in.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => demo("clear")} loading={busy === "clear"}>Remove demo content</Button>
          <Button variant="ghost" onClick={() => demo("seed")} loading={busy === "seed"}>Add demo content again</Button>
        </div>
      </Card>

      {mode === "supabase" && (
        <Card className="space-y-4">
          <h2 className="font-display text-2xl">Account</h2>
          <Field label="New password" hint="Set one after accepting an invite, so you can sign in with a password next time">
            <div className="flex gap-2">
              <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button variant="soft" onClick={changePassword} loading={busy === "pw"}>Update</Button>
            </div>
          </Field>
          <Button variant="danger" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
        </Card>
      )}
    </div>
  );
}
