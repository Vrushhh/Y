"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { readLocal, uid, writeLocal } from "@/lib/local";
import { Button, ErrorNote, Field, IconButton, Input, Modal, Select, TextArea } from "@/components/ui";
import { ImagePicker, MediaImage } from "@/components/MediaInputs";

type Secret = { id: string; unlock_key: string; title: string; message: string | null; image_path: string | null; created_by: string };

const KEYS: Record<string, { label: string; how: string }> = {
  moon: { label: "The moon", how: "Tap the moon five times." },
  constellation: { label: "Hidden stars", how: "Find all seven hidden stars on this page." },
  "game-champion": { label: "Game reward", how: "Finish any game in Date mode." },
  "hidden-memory": { label: "Hidden photograph", how: "Tap the memory counter on the map three times." },
  "secret-letter": { label: "Secret letter", how: "Unlocks with the moon. Opens the secret envelope in Letters." }
};
const STARS = [[12, 22], [78, 14], [34, 64], [88, 58], [55, 30], [20, 84], [68, 82]];

export default function SecretCorner() {
  const { mode, userId, unlocks, unlock, toast } = useApp();
  const [moonTaps, setMoonTaps] = useState(0);
  const [found, setFound] = useState<number[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [reveal, setReveal] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ unlock_key: "moon", title: "", message: "", image: [] as string[] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setFound(readLocal<number[]>("stars-found", [])); }, []);

  const load = useCallback(async () => {
    if (mode === "preview") { setSecrets(readLocal<Secret[]>("secrets", [])); return; }
    // RLS returns only secrets you wrote, or ones whose key you have unlocked.
    const { data } = await getSupabase()!.from("secrets").select("id,unlock_key,title,message,image_path,created_by").order("created_at");
    setSecrets((data as Secret[]) ?? []);
  }, [mode]);
  useEffect(() => { load(); }, [load, unlocks.length]);

  const celebrate = async (key: string) => {
    const fresh = await unlock(key);
    if (key === "moon") await unlock("secret-letter");
    if (fresh) { setReveal(key); toast("You found a secret.", "success"); }
    load();
  };

  const tapMoon = () => {
    const n = moonTaps + 1;
    setMoonTaps(n);
    if (n === 5) celebrate("moon");
  };
  const tapStar = (i: number) => {
    if (found.includes(i)) return;
    const next = [...found, i];
    setFound(next);
    writeLocal("stars-found", next);
    if (next.length === STARS.length) celebrate("constellation");
  };

  const mine = secrets.filter((s) => s.created_by === userId);
  const forMe = useMemo(
    () => secrets.filter((s) => s.created_by !== userId && unlocks.includes(s.unlock_key)),
    [secrets, userId, unlocks]
  );
  const shown = reveal ? forMe.filter((s) => s.unlock_key === reveal) : [];

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
      <div className="relative -mx-4 mb-10 h-[62dvh] overflow-hidden sm:mx-0 sm:rounded-[28px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(248,232,216,0.12),transparent_40%)]" />
        <motion.button
          onClick={tapMoon} aria-label="The moon"
          whileTap={{ scale: 0.94 }} animate={{ boxShadow: `0 0 ${40 + moonTaps * 20}px rgba(248,232,216,${0.25 + moonTaps * 0.1})` }}
          className="absolute right-[14%] top-[14%] h-24 w-24 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fffaf2,#F8E8D8_45%,#d9c2b0)] sm:h-32 sm:w-32"
        >
          <span className="absolute left-[30%] top-[40%] h-3 w-3 rounded-full bg-[#d9c2b0]/70" />
          <span className="absolute left-[55%] top-[60%] h-5 w-5 rounded-full bg-[#d9c2b0]/60" />
        </motion.button>
        {STARS.map(([x, y], i) => (
          <button key={i} onClick={() => tapStar(i)} aria-label="A faint star" className="absolute p-3" style={{ left: `${x}%`, top: `${y}%` }}>
            <span className={`block h-1.5 w-1.5 rotate-45 transition duration-700 ${found.includes(i) ? "scale-[2.5] bg-blush shadow-[0_0_12px_#E8B9D0]" : "bg-cream/40"}`} />
          </button>
        ))}
        {found.length > 1 && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline points={found.map((i) => `${STARS[i][0] + 1},${STARS[i][1] + 2}`).join(" ")} fill="none" stroke="#E8B9D0" strokeOpacity="0.4" strokeWidth="0.25" />
          </svg>
        )}
        <div className="absolute bottom-6 left-6 max-w-xs">
          <h1 className="font-display text-4xl">Secret corner</h1>
          <p className="mt-2 text-sm text-lilac">Some things here respond to being noticed.</p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(KEYS).map(([k, v]) => {
          const got = unlocks.includes(k);
          return (
            <button key={k} onClick={() => got && setReveal(k)} className={`glass rounded-[20px] p-4 text-left ${got ? "" : "opacity-60"}`}>
              <p className="flex items-center gap-2 text-cloud">{got ? "✦" : <Lock className="h-3.5 w-3.5" />} {v.label}</p>
              <p className="mt-1 text-xs text-lilac">{got ? "Found. Tap to see it again." : v.how}</p>
            </button>
          );
        })}
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

      <AnimatePresence>
        {reveal && (
          <Modal open onClose={() => setReveal(null)} title={KEYS[reveal]?.label ?? "A secret"}>
            <div className="space-y-4">
              {shown.length === 0 ? (
                <p className="font-romance text-xl italic text-lilac">
                  {reveal === "moon" ? "You kept tapping the moon. That’s the kind of curiosity worth loving. The secret envelope in Letters is open now." : "You found it. Nothing’s hidden here yet, but your person can leave something for you."}
                </p>
              ) : shown.map((s) => (
                <div key={s.id} className="paper rounded-2xl p-6">
                  <p className="font-display text-2xl">{s.title}</p>
                  {s.message && <p className="mt-2 whitespace-pre-line font-hand text-2xl">{s.message}</p>}
                  {s.image_path && <MediaImage path={s.image_path} alt="" className="mt-4 w-full rounded-xl" />}
                </div>
              ))}
            </div>
          </Modal>
        )}
      </AnimatePresence>

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
    </div>
  );
}
