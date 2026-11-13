"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { ArrowRight, Camera, Clapperboard, Lock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { readLocal, removeLocal, uid, writeLocal } from "@/lib/local";
import { Button, ErrorNote, Field, IconButton, Input, Modal, Select, TextArea } from "@/components/ui";
import { ImagePicker, MediaImage } from "@/components/MediaInputs";
import { useCollection, type Row } from "@/lib/useCollection";
import YearOneReview from "./YearOneReview";

type Secret = { id: string; unlock_key: string; title: string; message: string | null; image_path: string | null; created_by: string };

type Memory = Row & { title: string; image_paths?: string[] };

const KEYS: Record<string, { label: string; how: string; reward: string }> = {
  moon: { label: "The moon", how: "Tap the glowing moon five times.", reward: "You kept tapping the moon. I love that you’d check whether even the moon has something to say." },
  constellation: { label: "Hidden stars", how: "Light all seven diamond-shaped stars in this sky. Ask for a hint if you get stuck.", reward: "You made a constellation out of seven tiny things. That feels a lot like how we made a whole year out of ordinary days." },
  "game-champion": { label: "Game reward", how: "Pick a two-player quiz in Date Mode, share the invite, and play until the results screen.", reward: "You’ve earned the title of Certified Co-Star. Your prize is bragging rights and the right to demand a rematch." },
  "hidden-memory": { label: "Hidden photograph", how: "In Our Constellation, tap the counter that says ‘moments illuminated’ three times.", reward: "Here’s a little piece of our camera roll. If we haven’t saved a photo to the constellation yet, this spot is waiting for one." },
  "secret-letter": { label: "Secret letter", how: "Wake the moon first. Then unseal the note here to open the secret envelope in Letters, too.", reward: "Yukku, if I could tuck one thing into your pocket for every day of the next year, it would be this. Somewhere, I’m probably thinking of you and smiling at my phone. Love, Sonu." }
};
const STARS = [
  { x: 12, y: 22, hint: "Look near the upper-left edge of the sky." },
  { x: 54, y: 13, hint: "Look near the top, a little right of centre." },
  { x: 34, y: 60, hint: "Look below the middle on the left." },
  { x: 87, y: 61, hint: "Look towards the far right, below the moon." },
  { x: 46, y: 35, hint: "Look just left of centre in the upper half." },
  { x: 19, y: 82, hint: "Look near the bottom-left corner." },
  { x: 67, y: 82, hint: "Look near the bottom, two-thirds across the sky." },
];

export default function SecretCorner() {
  const { mode, userId, email, unlocks, unlock, toast } = useApp();
  const [moonTaps, setMoonTaps] = useState(0);
  const moonTapsRef = useRef(0);
  const [found, setFound] = useState<number[]>([]);
  const [hint, setHint] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [reveal, setReveal] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ unlock_key: "moon", title: "", message: "", image: [] as string[] });
  const [error, setError] = useState<string | null>(null);
  const canPreview = mode === "preview" || email === "vrushabhcr7@gmail.com";
  const [testUnlocked, setTestUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (canPreview && (p.get("unlock-all") === "1" || p.get("deck") === "1")) {
      setTestUnlocked(true);
      setReviewOpen(true);
    }
  }, [canPreview]);

  const { items: memories } = useCollection<Memory>("memories", { order: "memory_date", ascending: false, realtime: false });
  const featured = memories.find((memory) => memory.image_paths?.[0]);
  const photo = featured?.image_paths?.[0] ? { path: featured.image_paths[0], title: featured.title } : undefined;
  const total = Object.keys(KEYS).length;
  const completed = testUnlocked ? total : Object.keys(KEYS).filter((key) => unlocks.includes(key)).length;
  const reviewUnlocked = completed === total;
  const nextStar = STARS.findIndex((_, i) => !found.includes(i));
  const starStorage = userId ? `stars-found:${userId}` : null;

  useEffect(() => {
    if (!starStorage) return;
    const legacy = readLocal<number[]>("stars-found", []);
    const saved = readLocal<number[]>(starStorage, legacy);
    setFound([...new Set(Array.isArray(saved) ? saved.filter((i) => Number.isInteger(i) && i >= 0 && i < STARS.length) : [])]);
    if (legacy.length) {
      try { writeLocal(starStorage, saved); removeLocal("stars-found"); } catch { /* progress still works in this visit */ }
    }
  }, [starStorage]);

  const load = useCallback(async () => {
    if (mode === "preview") { setSecrets(readLocal<Secret[]>("secrets", [])); return; }
    // RLS returns only secrets you wrote, or ones whose key you have unlocked.
    const { data } = await getSupabase()!.from("secrets").select("id,unlock_key,title,message,image_path,created_by").order("created_at");
    setSecrets((data as Secret[]) ?? []);
  }, [mode]);
  useEffect(() => { load(); }, [load, unlocks]);

  const celebrate = async (key: string) => {
    if (await unlock(key)) {
      setReveal(key);
      toast("You found a secret.", "success");
    }
  };

  const tapMoon = () => {
    if (unlocks.includes("moon")) { setReveal("moon"); return; }
    const next = Math.min(moonTapsRef.current + 1, 5);
    moonTapsRef.current = next;
    setMoonTaps(next);
    if (next === 5) void celebrate("moon");
  };

  const tapStar = (i: number) => {
    if (unlocks.includes("constellation")) return;
    const next = found.includes(i) ? found : [...found, i];
    setFound(next);
    if (starStorage) {
      try { writeLocal(starStorage, next); } catch { /* progress still works in this visit */ }
    }
    if (next.length === STARS.length) void celebrate("constellation");
  };

  const mine = secrets.filter((secret) => secret.created_by === userId);
  const shown = secrets.filter((secret) => secret.created_by !== userId && secret.unlock_key === reveal && unlocks.includes(secret.unlock_key));

  const save = async () => {
    if (!form.title.trim()) return setError("Give the surprise a title.");
    const values = { unlock_key: form.unlock_key, title: form.title.trim(), message: form.message || null, image_path: form.image[0] ?? null };
    if (mode === "preview") writeLocal("secrets", [...readLocal<Secret[]>("secrets", []), { id: uid(), created_by: userId!, ...values }]);
    else {
      const { error: err } = await getSupabase()!.from("secrets").insert(values);
      if (err) return setError(err.message);
    }
    setOpen(false); setForm({ unlock_key: "moon", title: "", message: "", image: [] }); load();
    toast("Hidden. Your person will only see it when they find it.", "success");
  };
  const del = async (id: string) => {
    if (mode === "preview") writeLocal("secrets", readLocal<Secret[]>("secrets", []).filter((s) => s.id !== id));
    else await getSupabase()!.from("secrets").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-blush">Anniversary scavenger hunt</p>
        <h1 className="mt-2 font-display text-5xl">Secret corner</h1>
        <p className="mt-2 max-w-xl text-sm text-lilac">Follow the five clues to unlock a little premiere about our first year together.</p>
      </header>

      <section className="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-5 sm:p-6" aria-label="Year One Relationship Review">
        <div className="flex items-center gap-4">
          <Clapperboard className="h-8 w-8 shrink-0 text-blush" aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl text-cream">Year One Relationship Review</h2>
            <p className="mt-1 text-sm text-lilac" role="status">{completed} of {total} discoveries found</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button disabled={!reviewUnlocked} onClick={() => setReviewOpen(true)}>
            {reviewUnlocked ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {reviewUnlocked ? "Watch the review" : "Review locked"}
          </Button>
          {canPreview && !reviewUnlocked && (
            <button
              type="button"
              onClick={() => {
                setTestUnlocked(true);
                setReviewOpen(true);
              }}
              className="text-[11px] font-semibold text-lilac/70 hover:text-gold transition underline underline-offset-4 ml-1"
            >
              (Test: Open Deck)
            </button>
          )}
        </div>
      </section>

      <section id="secret-sky" aria-label="Hunt sky" className="glass mb-8 scroll-mt-6 overflow-hidden rounded-[28px]">
        <div className="relative h-[310px] overflow-hidden bg-[radial-gradient(circle_at_76%_28%,rgba(248,232,216,0.14),transparent_45%)] sm:h-[360px]">
          <motion.button
            onClick={tapMoon} aria-label="The moon"
            whileTap={{ scale: 0.94 }}
            animate={{ boxShadow: `0 0 ${40 + moonTaps * 10}px rgba(248,232,216,0.35)` }}
            className="absolute right-[13%] top-[14%] h-[76px] w-[76px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#fffaf2,#F8E8D8_45%,#d9c2b0)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blush sm:h-28 sm:w-28"
          >
            <span className="absolute left-[30%] top-[40%] h-3 w-3 rounded-full bg-[#d9c2b0]/70" />
            <span className="absolute left-[55%] top-[60%] h-5 w-5 rounded-full bg-[#d9c2b0]/60" />
          </motion.button>
          {STARS.map(({ x, y }, i) => {
            const lit = unlocks.includes("constellation") || found.includes(i);
            const hinted = hint && i === nextStar && !lit;
            return (
              <button key={i} onClick={() => tapStar(i)} aria-label={`Star ${i + 1}`} aria-pressed={lit}
                className={`absolute z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blush ${hinted ? "ring-2 ring-blush" : ""}`}
                style={{ left: `${x}%`, top: `${y}%` }}>
                <span className={`block h-2 w-2 rotate-45 transition ${lit ? "scale-150 bg-blush shadow-[0_0_12px_#E8B9D0]" : "bg-cream/80"}`} />
              </button>
            );
          })}
          {(found.length > 1 || unlocks.includes("constellation")) && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={(unlocks.includes("constellation") ? STARS : found.map((i) => STARS[i])).map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke="#E8B9D0" strokeOpacity="0.45" strokeWidth="0.25" />
            </svg>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lilac/15 px-5 py-3 text-sm text-lilac">
          <p role="status">Moon · {unlocks.includes("moon") ? "5" : moonTaps}/5 taps <span className="mx-1">·</span> Stars · {unlocks.includes("constellation") ? STARS.length : found.length}/{STARS.length} lit</p>
          {nextStar >= 0 && !unlocks.includes("constellation") && (
            <Button variant="soft" size="sm" onClick={() => setHint(!hint)} aria-expanded={hint}>{hint ? "Hide star hint" : "Show star hint"}</Button>
          )}
          {hint && nextStar >= 0 && !unlocks.includes("constellation") && <p className="w-full text-cream" role="status">{STARS[nextStar].hint}</p>}
          {nextStar < 0 && !unlocks.includes("constellation") && (
            <Button variant="soft" size="sm" onClick={() => celebrate("constellation")}>Save star discovery</Button>
          )}
        </div>
      </section>

      <section aria-labelledby="clue-list">
        <h2 id="clue-list" className="mb-3 font-display text-3xl">Your five clues</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(KEYS).map(([key, clue], i) => {
            const got = unlocks.includes(key);
            const canUnseal = key === "secret-letter" && unlocks.includes("moon");
            const destination = key === "game-champion" ? "/date-mode" : key === "hidden-memory" ? "/memories#memory-counter" : "#secret-sky";
            const label = key === "game-champion" ? "Open Date Mode" : key === "hidden-memory" ? "Find the memory counter" : "Go to the sky";
            return (
              <li key={key} className="glass flex flex-col items-start gap-2 rounded-[20px] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-blush">Clue {i + 1} · {got ? "Found" : "To do"}</p>
                <h3 className="font-display text-xl text-cloud">{clue.label}</h3>
                <p className="flex-1 text-sm leading-relaxed text-lilac">{clue.how}</p>
                {got || canUnseal ? (
                  <Button variant="soft" size="sm" onClick={() => got ? setReveal(key) : celebrate(key)}>
                    {got ? "Reopen reward" : "Unseal the letter"}
                  </Button>
                ) : (
                  <Link href={destination} className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-blush hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-blush">
                    {label} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Surprises you’ve hidden</h2>
            <p className="text-sm text-lilac">Leave a message or photo behind a secret. Your person sees it only after finding that secret.</p>
          </div>
          <Button variant="soft" onClick={() => { setError(null); setOpen(true); }}><Plus className="h-4 w-4" /> Hide something</Button>
        </div>
        {mine.length === 0 ? <p className="text-sm text-lilac/70">Nothing hidden yet.</p> : (
          <ul className="space-y-2">
            {mine.map((s) => (
              <li key={s.id} className="glass flex items-center justify-between rounded-2xl px-4 py-3">
                <span><span className="text-cloud">{s.title}</span> <span className="text-xs text-lilac">behind {KEYS[s.unlock_key]?.label}</span></span>
                <IconButton label="Delete surprise" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></IconButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {typeof document !== "undefined" && createPortal(
        <>
          {reviewOpen && reviewUnlocked && <YearOneReview onClose={() => setReviewOpen(false)} photo={photo} />}
          <Modal open={!!reveal} onClose={() => setReveal(null)} title={reveal ? KEYS[reveal].label : ""}>
            {reveal && (
              <div className="space-y-4">
                <p className="font-romance text-xl italic text-cloud">{KEYS[reveal].reward}</p>
                {reveal === "hidden-memory" && (
                  photo
                    ? <MediaImage path={photo.path} alt={photo.title} className="max-h-72 w-full rounded-2xl object-contain" />
                    : <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-lilac/30 text-blush"><Camera className="h-8 w-8" aria-hidden="true" /></div>
                )}
                {reveal === "secret-letter" && <Link className="inline-block rounded-lg text-sm font-semibold text-blush underline underline-offset-4" href="/letters">Visit the secret envelope in Letters</Link>}
                {shown.map((secret) => (
                  <div key={secret.id} className="paper rounded-2xl p-6">
                    <p className="font-display text-2xl">{secret.title}</p>
                    {secret.message && <p className="mt-2 whitespace-pre-line font-hand text-2xl">{secret.message}</p>}
                    {secret.image_path && <MediaImage path={secret.image_path} alt="" className="mt-4 w-full rounded-xl" />}
                  </div>
                ))}
              </div>
            )}
          </Modal>

          <Modal open={open} onClose={() => setOpen(false)} title="Hide a surprise">
            <div className="space-y-4">
              <Field label="Hidden behind"><Select value={form.unlock_key} onChange={(e) => setForm({ ...form, unlock_key: e.target.value })}>{Object.entries(KEYS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
              <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Message"><TextArea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
              <ImagePicker value={form.image} onChange={(image) => setForm({ ...form, image })} folder="secrets" label="Add a secret photo" />
              <ErrorNote message={error} />
              <Button className="w-full" onClick={save}>Hide it</Button>
            </div>
          </Modal>
        </>,
        document.body
      )}
    </div>
  );
}
