"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Coins, ExternalLink, Globe2, Heart, Loader2, Palette, Plus, Sparkles, Trash2, Trophy, Users } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { GAMES, gameName, type GameType } from "@/lib/game";
import { Button, EmptyState, ErrorNote, Field, IconButton, Input, Modal, PageHeader, Select, TextArea } from "@/components/ui";
import { ImagePicker } from "@/components/MediaInputs";

type Room = { id: string; game_type: string; status: string; created_by: string; created_at: string; expires_at: string };
type Question = { id: string; game_type: string; question_text: string; options: string[]; correct_answer: string | null };

export default function DateMode() {
  const { mode, relationship, userId, nameOf, toast } = useApp();
  const router = useRouter();
  const [rounds, setRounds] = useState(5);
  const [busy, setBusy] = useState<GameType | null>(null);
  const [launchError, setLaunchError] = useState<{ game: GameType; message: string } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [custom, setCustom] = useState<Question[]>([]);
  const [qOpen, setQOpen] = useState(false);
  const [q, setQ] = useState({ game_type: "relationship_trivia", question_text: "", options: "", correct_answer: "", image: [] as string[] });
  const [qError, setQError] = useState<string | null>(null);

  const load = async () => {
    const sb = getSupabase();
    if (!sb || !relationship) return;
    const [r, c] = await Promise.all([
      sb.from("game_rooms").select("id,game_type,status,created_by,created_at,expires_at").eq("relationship_id", relationship.id)
        .in("status", ["waiting", "playing"]).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(5),
      sb.from("game_questions").select("id,game_type,question_text,options,correct_answer").eq("relationship_id", relationship.id).order("created_at", { ascending: false })
    ]);
    setRooms((r.data as Room[]) ?? []);
    setCustom((c.data as Question[]) ?? []);
  };

  useEffect(() => {
    load();
    const sb = getSupabase();
    if (!sb || !relationship) return;
    const ch = sb.channel(`rooms:${relationship.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `relationship_id=eq.${relationship.id}` }, load)
      .subscribe();
    return () => { sb.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationship?.id]);

  const create = async (type: GameType) => {
    const sb = getSupabase();
    if (busy || !sb) return;
    setBusy(type);
    setLaunchError(null);
    try {
      const { data, error } = await sb.rpc("create_game_room", { p_game_type: type, p_rounds: rounds });
      if (error || !data) {
        setLaunchError({ game: type, message: error?.message ?? "The server didn’t return a room. Try again." });
        setBusy(null);
        return;
      }
      router.push(`/date-mode/room/${data}`);
    } catch {
      setLaunchError({ game: type, message: "Check your connection and try again." });
      setBusy(null);
    }
  };

  const saveQuestion = async () => {
    setQError(null);
    const options = q.options.split("\n").map((s) => s.trim()).filter(Boolean);
    const needsOptions = !["guess_my_answer", "finish_sentence"].includes(q.game_type);
    if (!q.question_text.trim()) return setQError("Write the question.");
    if (needsOptions && options.length < 2) return setQError("Add at least two options, one per line.");
    if (q.correct_answer && !options.includes(q.correct_answer.trim())) return setQError("The correct answer must match one of the options exactly.");
    const { error } = await getSupabase()!.from("game_questions").insert({
      game_type: q.game_type, question_text: q.question_text.trim(), options: needsOptions ? options : [],
      correct_answer: q.correct_answer.trim() || null, image_path: q.image[0] ?? null
    });
    if (error) return setQError(error.message);
    setQ({ ...q, question_text: "", options: "", correct_answer: "", image: [] });
    setQOpen(false);
    toast("Question added", "success");
    load();
  };

  const delQuestion = async (id: string) => {
    const { error } = await getSupabase()!.from("game_questions").delete().eq("id", id);
    if (error) toast(error.message, "error"); else load();
  };

  return (
    <div>
      <PageHeader
        title="Two-player date mode"
        subtitle="Each of you plays on your own phone. Answers stay hidden until you’ve both locked in, then they’re revealed together."
        action={mode === "supabase" ? <Button variant="soft" onClick={() => setQOpen(true)}><Plus className="h-4 w-4" /> Add your own question</Button> : undefined}
      />

      {/* Live Virtual Space: Musée de Notre Amour */}
      <section className="mb-8">
        <Link
          href="/date-mode/museum"
          className="group relative block overflow-hidden rounded-[26px] border border-blush/35 bg-gradient-to-r from-[#2b1f45]/90 via-[#402b54]/80 to-[#271a3e]/90 p-6 sm:p-8 shadow-glow transition hover:border-blush/60 hover:brightness-105"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blush/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-40 w-40 rounded-full bg-lilac/20 blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blush/20 border border-blush/40 px-3 py-1 text-xs font-medium text-blush">
                  <Sparkles className="h-3 w-3" /> Live Virtual Space
                </span>
                <span className="text-xs text-lilac/80">Realtime Multiplayer Date</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-cloud leading-tight">
                Musée de Notre Amour
              </h2>
              <p className="text-sm text-lilac/90 leading-relaxed">
                Step into a shared 2D virtual art gallery together. Walk across the marble floor, inspect your memories framed as golden masterpieces, toss coins into the wishing fountain, paint together on the easel, and solve the curator’s scavenger hunt.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-cloud/80">
                <span className="inline-flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-amber-300" /> Wishing Fountain
                </span>
                <span className="inline-flex items-center gap-1">
                  <Palette className="h-3.5 w-3.5 text-rose-300" /> Co-Op Canvas
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-blush" /> Handholding
                </span>
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-300" /> Golden Vault
                </span>
              </div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blush to-lilac px-6 py-3 text-sm font-bold text-midnight shadow-glow transition group-hover:scale-105">
                Enter Museum Together <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      <section className="glass mb-8 flex flex-col gap-5 rounded-[26px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blush/15 text-blush">
            <Globe2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-blush">Travel together</p>
            <h2 className="mt-1 font-display text-3xl text-cloud">WorldGuessr</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-lilac">
              You’re dropped somewhere in the world. Read the street signs, follow the clues, and see who can pin the closest spot.
            </p>
            <p className="mt-2 text-xs text-lilac">To play together, open Party in WorldGuessr and share its invite link.</p>
          </div>
        </div>
        <a
          href="https://www.worldguessr.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-blush to-lilac px-6 py-3 text-sm font-bold text-midnight shadow-glow transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blush sm:self-center"
        >
          Play WorldGuessr <span className="sr-only">(opens in a new tab)</span> <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </section>

      {mode === "preview" ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Trivia quizzes need a database backend"
          body="Two-device trivia requires Supabase Realtime to keep answers private until both submit. Enter the Live Virtual Museum above to explore together!"
        />
      ) : (
        <>
          {rooms.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-2xl">Games waiting for you</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {rooms.map((r) => (
                  <button key={r.id} onClick={() => router.push(`/date-mode/room/${r.id}`)} className="glass flex items-center justify-between rounded-[20px] p-4 text-left">
                    <span>
                      <span className="block text-cloud">{gameName(r.game_type)}</span>
                      <span className="text-sm text-lilac">{r.created_by === userId ? "You started it" : `${nameOf(r.created_by)} started it`}, {r.status === "playing" ? "in progress" : "waiting"}</span>
                    </span>
                    <span className="rounded-full bg-blush/90 px-3 py-1 text-xs font-medium text-midnight">{r.status === "playing" ? "Rejoin" : "Join"}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <h2 className="mb-1 font-display text-3xl">Pick a game for two</h2>
          <p className="mb-4 text-sm text-lilac">Open a room, share the invite, and tap ready on both devices.</p>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-lilac" role="group" aria-label="Round limit">
            <span>Up to</span>
            {[3, 5, 8, 10].map((n) => (
              <button key={n} onClick={() => setRounds(n)} className={`h-9 w-9 rounded-full ${rounds === n ? "bg-cloud/15 text-cloud" : "hover:bg-cloud/5"}`} aria-label={`Up to ${n} rounds`} aria-pressed={rounds === n} disabled={!!busy}>{n}</button>
            ))}
            <span>rounds</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GAMES.map((g, i) => (
              <motion.button
                key={g.type}
                whileHover={{ y: -4 }}
                onClick={() => create(g.type)}
                disabled={!!busy}
                aria-busy={busy === g.type}
                className="glass group flex flex-col items-start gap-3 rounded-[22px] p-5 text-left transition-colors hover:border-blush/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blush disabled:cursor-wait disabled:opacity-60"
              >
                <span className="font-display text-4xl text-blush/60">{String.fromCharCode(65 + i)}</span>
                <span className="font-display text-xl leading-tight text-cloud">{g.name}</span>
                <span className="text-sm text-lilac">{g.blurb}</span>
                <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm text-blush">
                  {busy === g.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {busy === g.type ? "Opening room…" : launchError?.game === g.type ? "Try again" : "Start a room"}
                </span>
                {launchError?.game === g.type && (
                  <span role="alert" className="text-xs text-cloud">Couldn’t open the room. {launchError.message}</span>
                )}
              </motion.button>
            ))}
          </div>

          {custom.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 font-display text-2xl">Your questions</h2>
              <ul className="glass divide-y divide-lilac/10 rounded-[22px]">
                {custom.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0"><span className="block truncate">{c.question_text}</span><span className="text-xs text-lilac">{gameName(c.game_type)}</span></span>
                    <IconButton label="Delete question" onClick={() => delQuestion(c.id)}><Trash2 className="h-4 w-4" /></IconButton>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Modal open={qOpen} onClose={() => setQOpen(false)} title="Add your own question">
        <div className="space-y-4">
          <Field label="Game">
            <Select value={q.game_type} onChange={(e) => setQ({ ...q, game_type: e.target.value })}>
              {GAMES.map((g) => <option key={g.type} value={g.type}>{g.name}</option>)}
            </Select>
          </Field>
          <Field label="Question"><TextArea className="min-h-[80px]" value={q.question_text} onChange={(e) => setQ({ ...q, question_text: e.target.value })} /></Field>
          {!["guess_my_answer", "finish_sentence"].includes(q.game_type) && (
            <Field label="Options" hint="One per line"><TextArea className="min-h-[100px]" value={q.options} onChange={(e) => setQ({ ...q, options: e.target.value })} /></Field>
          )}
          {["relationship_trivia", "memory_challenge"].includes(q.game_type) && (
            <Field label="Correct answer" hint="Optional. Leave empty to score by matching each other instead."><Input value={q.correct_answer} onChange={(e) => setQ({ ...q, correct_answer: e.target.value })} /></Field>
          )}
          {q.game_type === "memory_challenge" && <ImagePicker value={q.image} onChange={(image) => setQ({ ...q, image })} folder="games" label="Add the photo" />}
          <ErrorNote message={qError} />
          <Button className="w-full" onClick={saveQuestion}>Add question</Button>
        </div>
      </Modal>
    </div>
  );
}
