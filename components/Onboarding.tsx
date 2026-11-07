"use client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useApp } from "@/components/providers/AppProvider";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { DEFAULT_START_DATE } from "@/lib/config";

/** Shown to a signed-in user who is not yet part of a relationship. */
export function Onboarding() {
  const { refresh, email } = useApp();
  const [name, setName] = useState("Our Little Universe");
  const [date, setDate] = useState(DEFAULT_START_DATE);
  const [display, setDisplay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true); setError(null);
    const { error: err } = await getSupabase()!.rpc("create_relationship", {
      p_name: name, p_start_date: date, p_display_name: display || "You", p_with_demo: true
    });
    setBusy(false);
    if (err) setError(err.message); else refresh();
  };

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card className="space-y-5 p-8">
        <div>
          <h1 className="font-display text-4xl">Create our universe</h1>
          <p className="mt-2 text-sm text-lilac">
            Signed in as {email}. If your partner already created it, ask them to invite this email from Settings, then sign in again.
          </p>
        </div>
        <Field label="What should we call it?"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="The day it began"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Your name, as your partner sees it"><Input value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="e.g. your nickname" /></Field>
        <ErrorNote message={error} />
        <Button className="w-full" onClick={create} loading={busy}>Create our universe</Button>
        <p className="text-xs text-lilac/70">Demo content is added so nothing looks empty. Each demo item is labelled and can be removed in Settings.</p>
      </Card>
    </div>
  );
}
