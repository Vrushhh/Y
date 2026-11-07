"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, Users } from "lucide-react";
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
  const [busy, setBusy] = useState<string | null>(null);
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
    setBusy(type);
    const { data, error } = await getSupabase()!.rpc("create_game_room", { p_game_type: type, p_rounds: rounds });
    setBusy(null);
    if (error) return toast(error.message, "error");
    router.push(`/date-mode/room/${data}`);
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

      {mode === "preview" ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Date mode needs the real backend"
          body="Two devices can only play together through Supabase Realtime, and answers are kept private by the database. Add your Supabase keys (see SETUP_GUIDE.md) and this page comes alive."
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

          <div className="mb-4 flex items-center gap-3 text-sm text-lilac">
            <span>Rounds</span>
            {[3, 5, 8, 10].map((n) => (
              <button key={n} onClick={() => setRounds(n)} className={`h-9 w-9 rounded-full ${rounds === n ? "bg-cloud/15 text-cloud" : "hover:bg-cloud/5"}`} aria-pressed={rounds === n}>{n}</button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GAMES.map((g, i) => (
              <motion.button
                key={g.type}
                whileHover={{ y: -4 }}
                onClick={() => create(g.type)}
                disabled={!!busy}
                className="glass group flex flex-col items-start gap-3 rounded-[22px] p-5 text-left disabled:opacity-60"
              >
                <span className="font-display text-4xl text-blush/60">{String.fromCharCode(65 + i)}</span>
                <span className="font-display text-xl leading-tight text-cloud">{g.name}</span>
                <span className="text-sm text-lilac">{g.blurb}</span>
                <span className="mt-auto pt-2 text-sm text-blush">{busy === g.type ? "Creating room…" : "Start a room"}</span>
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
