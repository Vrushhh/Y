"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Crown, Heart, Link2, RotateCcw, Sparkles, WifiOff } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { gameName, similarity, usesPrediction } from "@/lib/game";
import { Button, Card, EmptyState, ErrorNote, Input, Spinner } from "@/components/ui";
import { MediaImage } from "@/components/MediaInputs";

type Room = { id: string; game_type: string; status: string; current_round: number; total_rounds: number; expires_at: string; next_room_id: string | null; created_by: string };
type Player = { user_id: string; score: number; is_ready: boolean; answered_round: number };
type Question = { id: string; question_text: string; options: string[]; correct_answer: string | null; image_path: string | null; points: number };
type Round = { id: string; round_number: number; status: string; matched: boolean | null; question: Question };
type Answer = { round_id: string; user_id: string; answer: string; prediction: string | null; points_awarded: number };

export default function GameRoom() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { mode, userId, nameOf, toast, unlock } = useApp();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [prediction, setPrediction] = useState("");
  const [step, setStep] = useState<"answer" | "predict">("answer");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || loadingRef.current) return;
    loadingRef.current = true;
    const [r, p, rd, a] = await Promise.all([
      sb.from("game_rooms").select("*").eq("id", id).maybeSingle(),
      sb.from("game_players").select("user_id,score,is_ready,answered_round").eq("room_id", id).order("joined_at"),
      sb.from("game_rounds").select("id,round_number,status,matched,question:game_questions(id,question_text,options,correct_answer,image_path,points)").eq("room_id", id).order("round_number"),
      sb.from("game_answers").select("round_id,user_id,answer,prediction,points_awarded").eq("room_id", id)
    ]);
    loadingRef.current = false;
    if (!r.data) { setFatal("This room doesn’t exist or isn’t part of your universe."); setLoading(false); return; }
    setRoom(r.data as Room);
    setPlayers((p.data as Player[]) ?? []);
    setRounds((rd.data as unknown as Round[]) ?? []);
    setAnswers((a.data as Answer[]) ?? []);
    setLoading(false);
  }, [id]);

  // Join, then subscribe to every change in this room
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    let alive = true;
    (async () => {
      const { error } = await sb.rpc("join_game_room", { p_room: id });
      if (error && alive) {
        const { data } = await sb.from("game_players").select("user_id").eq("room_id", id).eq("user_id", userId).maybeSingle();
        if (!data) setFatal(error.message);
      }
      if (alive) load();
    })();

    const ch = sb.channel(`room:${id}`, { config: { presence: { key: userId } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `room_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rounds", filter: `room_id=eq.${id}` }, () => load())
      .on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState())))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setConnected(true); ch.track({ at: Date.now() }); load(); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnected(false);
      });

    // Reconnect handling: refetch state whenever the tab returns or the network comes back
    const resync = () => { if (document.visibilityState === "visible") load(); };
    const back = () => { setConnected(true); load(); };
    const lost = () => setConnected(false);
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", back);
    window.addEventListener("offline", lost);
    const poll = setInterval(load, 15000); // safety net if a realtime event is missed
    return () => {
      alive = false;
      sb.removeChannel(ch);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", back);
      window.removeEventListener("offline", lost);
    };
  }, [id, userId, load]);

  const me = players.find((p) => p.user_id === userId);
  const partner = players.find((p) => p.user_id !== userId);
  const current = rounds.find((r) => r.round_number === room?.current_round);
  const myAnswer = answers.find((a) => a.round_id === current?.id && a.user_id === userId);
  const partnerAnswer = answers.find((a) => a.round_id === current?.id && a.user_id !== userId);
  const predicts = room ? usesPrediction(room.game_type) : false;
  const expired = room && (room.status === "expired" || (room.status !== "finished" && new Date(room.expires_at) < new Date()));
  const partnerName = partner ? nameOf(partner.user_id) : "your person";

  // Reset the form when a new round opens
  useEffect(() => { setAnswer(""); setPrediction(""); setStep("answer"); }, [current?.id]);

  // Unlock the game reward once
  useEffect(() => {
    if (room?.status === "finished") unlock("game-champion").then((fresh) => fresh && toast("A new surprise is waiting in the Secret corner.", "success"));
  }, [room?.status, unlock, toast]);

  const call = async (fn: string, args: Record<string, unknown>) => {
    setBusy(true);
    const { data, error } = await getSupabase()!.rpc(fn, args);
    setBusy(false);
    if (error) { toast(error.message, "error"); return null; }
    await load();
    return data ?? true;
  };

  const submit = async () => {
    if (!answer.trim()) return;
    if (predicts && step === "answer") { setStep("predict"); return; }
    if (predicts && !prediction.trim()) return;
    await call("submit_game_answer", { p_room: id, p_answer: answer, p_prediction: predicts ? prediction : null });
  };

  const rematch = async () => {
    const next = await call("rematch_game_room", { p_room: id });
    if (typeof next === "string") router.push(`/date-mode/room/${next}`);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast("Copy the link from your address bar instead.", "error"); }
  };

  if (mode === "preview") return <EmptyState title="Date mode needs the real backend" body="Connect Supabase to play together on two devices." action={<Link href="/date-mode"><Button variant="soft">Back</Button></Link>} />;
  if (fatal) return <EmptyState title="Can’t open this game" body={fatal} action={<Link href="/date-mode"><Button variant="soft">Back to Date mode</Button></Link>} />;
  if (loading || !room) return <Spinner label="Entering the room" />;
  if (expired) return <EmptyState title="This room has expired" body="Rooms close after a while to keep things tidy. Start a fresh one." action={<Link href="/date-mode"><Button>Start a new game</Button></Link>} />;

  const scoreboard = (
    <div className="flex items-center justify-center gap-6 text-sm">
      {[me, partner].map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={clsx("h-2 w-2 rounded-full", p && online.includes(p.user_id) ? "bg-emerald-300" : "bg-lilac/40")} aria-label={p && online.includes(p.user_id) ? "online" : "offline"} />
          <span className="text-lilac">{p ? (p.user_id === userId ? "You" : nameOf(p.user_id)) : "Waiting…"}</span>
          <span className="num font-display text-2xl text-cream">{p?.score ?? 0}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <p className="text-sm text-lilac">{gameName(room.game_type)}</p>
        {room.status === "playing" && <p className="mt-1 font-display text-lg text-cloud/80">Round {room.current_round} of {room.total_rounds}</p>}
      </div>
      {!connected && (
        <p className="mb-4 flex items-center justify-center gap-2 rounded-full bg-[#5a2340]/40 px-4 py-2 text-sm text-blush"><WifiOff className="h-4 w-4" /> Reconnecting… your answers are safe.</p>
      )}

      {room.status === "waiting" && (
        <Card className="space-y-6 p-8 text-center">
          <h1 className="font-display text-4xl">Waiting room</h1>
          <div className="grid grid-cols-2 gap-4">
            {[me, partner].map((p, i) => (
              <div key={i} className={clsx("rounded-2xl border p-5", p?.is_ready ? "border-blush/50 bg-blush/10" : "border-lilac/15")}>
                <Heart className={clsx("mx-auto h-6 w-6", p?.is_ready ? "text-blush" : "text-lilac/40")} fill={p?.is_ready ? "currentColor" : "none"} />
                <p className="mt-2 text-cloud">{p ? (p.user_id === userId ? "You" : nameOf(p.user_id)) : "Not here yet"}</p>
                <p className="text-xs text-lilac">{p ? (p.is_ready ? "Ready" : "Getting ready") : "Send the link"}</p>
              </div>
            ))}
          </div>
          {!partner && (
            <div className="space-y-2">
              <p className="text-sm text-lilac">Send this to {partnerName}. They can also join from their Date mode page.</p>
              <div className="flex gap-2">
                <Input readOnly value={typeof window !== "undefined" ? window.location.href : ""} className="text-sm" aria-label="Invite link" />
                <Button variant="soft" onClick={copyLink} aria-label="Copy invite link">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
              </div>
            </div>
          )}
          <Button size="lg" className="w-full" loading={busy} onClick={() => call("set_player_ready", { p_room: id, p_ready: !me?.is_ready })}>
            {me?.is_ready ? "Not ready yet" : "I’m ready"}
          </Button>
          {me?.is_ready && partner && !partner.is_ready && <p className="text-sm text-lilac">Waiting for {partnerName} to get ready…</p>}
        </Card>
      )}

      {room.status === "playing" && current && (
        <div className="space-y-6">
          {scoreboard}
          <Card className="p-7 sm:p-9">
            {current.question.image_path && <MediaImage path={current.question.image_path} alt="Memory challenge photo" className="mb-5 max-h-72 w-full rounded-2xl object-cover" />}
            <h2 className="text-center font-romance text-2xl leading-snug sm:text-3xl">{current.question.question_text}</h2>

            <AnimatePresence mode="wait">
              {current.status === "open" && !myAnswer && (
                <motion.div key={`form-${step}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-7 space-y-4">
                  <p className="text-center text-sm text-lilac">
                    {step === "answer" ? (predicts ? "First, your own answer" : "Your answer stays hidden until you both lock in") : `Now guess: what did ${partnerName} pick?`}
                  </p>
                  {current.question.options.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {current.question.options.map((o) => {
                        const value = step === "answer" ? answer : prediction;
                        return (
                          <button key={o} onClick={() => (step === "answer" ? setAnswer(o) : setPrediction(o))}
                            className={clsx("rounded-2xl border px-4 py-3.5 text-left transition", value === o ? "border-blush bg-blush/15 text-cloud" : "border-lilac/20 text-cloud/90 hover:border-lilac/50")}
                            aria-pressed={value === o}>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Input
                      autoFocus value={step === "answer" ? answer : prediction} maxLength={500}
                      onChange={(e) => (step === "answer" ? setAnswer(e.target.value) : setPrediction(e.target.value))}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      placeholder={step === "answer" ? "Type your answer" : "Type your guess"}
                    />
                  )}
                  <div className="flex gap-2">
                    {step === "predict" && <Button variant="ghost" onClick={() => setStep("answer")}>Back</Button>}
                    <Button className="flex-1" size="lg" loading={busy} disabled={step === "answer" ? !answer.trim() : !prediction.trim()} onClick={submit}>
                      {predicts && step === "answer" ? "Next: guess theirs" : "Lock in my answer"}
                    </Button>
                  </div>
                </motion.div>
              )}

              {current.status === "open" && myAnswer && (
                <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 flex flex-col items-center gap-4 text-center">
                  <div className="relative h-16 w-16">
                    <span className="absolute inset-0 animate-ping rounded-full bg-blush/30" />
                    <span className="absolute inset-3 grid place-items-center rounded-full bg-gradient-to-br from-blush to-lilac"><Sparkles className="h-5 w-5 text-midnight" /></span>
                  </div>
                  <p className="text-cloud">Locked in: <span className="text-blush">{myAnswer.answer}</span></p>
                  <p className="text-sm text-lilac">
                    {partner && partner.answered_round >= room.current_round ? "Both answered. Revealing…" : `Waiting for ${partnerName}…`}
                  </p>
                </motion.div>
              )}

              {current.status === "revealed" && (
                <motion.div key="reveal" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[myAnswer, partnerAnswer].map((a, i) => (
                      <motion.div key={i} initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ delay: i * 0.15, duration: 0.5 }}
                        className={clsx("rounded-2xl border p-4 text-center", a && a.points_awarded > 0 ? "border-blush/60 bg-blush/10" : "border-lilac/20")}>
                        <p className="text-xs text-lilac">{i === 0 ? "You" : partnerName}</p>
                        <p className="mt-1 font-display text-xl text-cloud">{a?.answer ?? "…"}</p>
                        {predicts && a?.prediction && <p className="mt-2 text-xs text-lilac">guessed “{a.prediction}”</p>}
                        <p className="mt-2 text-sm text-cream">+{a?.points_awarded ?? 0}</p>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-center font-romance text-lg italic text-blush">
                    {current.matched ? "Same wavelength." : current.question.correct_answer ? `The answer was ${current.question.correct_answer}.` : "Different answers, still the same universe."}
                  </p>
                  <Button size="lg" className="w-full" loading={busy} onClick={() => call("advance_game_round", { p_room: id, p_from_round: room.current_round })}>
                    {room.current_round >= room.total_rounds ? "See results" : "Next question"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      )}

      {room.status === "finished" && (
        <Card className="space-y-6 p-8 text-center">
          <Crown className="mx-auto h-10 w-10 text-cream" />
          <h1 className="font-display text-4xl">
            {!me || !partner ? "Game over" : me.score === partner.score ? "A perfect tie" : me.score > partner.score ? "You win this round" : `${partnerName} wins this round`}
          </h1>
          {scoreboard}
          {["compatibility", "this_or_that", "would_you_rather"].includes(room.game_type) && (
            <p className="text-lilac">You matched on <span className="font-display text-3xl text-blush">{similarity(rounds.filter((r) => r.matched).length, rounds.length)}%</span> of questions.</p>
          )}
          <ul className="space-y-2 text-left">
            {rounds.map((r) => {
              const mine = answers.find((a) => a.round_id === r.id && a.user_id === userId);
              const theirs = answers.find((a) => a.round_id === r.id && a.user_id !== userId);
              return (
                <li key={r.id} className="rounded-2xl bg-cloud/5 px-4 py-3 text-sm">
                  <p className="text-cloud">{r.question.question_text}</p>
                  <p className="text-lilac">You: {mine?.answer ?? "-"} · {partnerName}: {theirs?.answer ?? "-"}</p>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            {room.next_room_id ? (
              <Button className="flex-1" onClick={() => router.push(`/date-mode/room/${room.next_room_id}`)}><Link2 className="h-4 w-4" /> Join the rematch</Button>
            ) : (
              <Button className="flex-1" loading={busy} onClick={rematch}><RotateCcw className="h-4 w-4" /> Play again</Button>
            )}
            <Link href="/date-mode" className="flex-1"><Button variant="soft" className="w-full">Pick another game</Button></Link>
          </div>
        </Card>
      )}

      <ErrorNote message={room.status === "playing" && !current ? "This round couldn’t be loaded. Pull to refresh." : null} />
    </div>
  );
}
