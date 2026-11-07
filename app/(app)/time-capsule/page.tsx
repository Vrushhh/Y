"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hourglass, Lock, LockOpen, Plus } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { readLocal, uid, writeLocal } from "@/lib/local";
import { countdown, formatDate } from "@/lib/time";
import { Button, EmptyState, ErrorNote, Field, Input, Modal, PageHeader, Spinner, TextArea } from "@/components/ui";
import { ImagePicker, MediaImage } from "@/components/MediaInputs";

type Capsule = { id: string; author_id: string; title: string; unlock_at: string; created_at: string; is_unlocked: boolean; content: string | null; attachment_path: string | null };
type LocalCapsule = Omit<Capsule, "is_unlocked">;

export default function TimeCapsule() {
  const { mode, userId, nameOf, toast } = useApp();
  const [items, setItems] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState<Capsule | null>(null);
  const [form, setForm] = useState({ title: "", content: "", unlock: "", photo: [] as string[] });
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    if (mode === "preview") {
      const t = Date.now();
      setItems(readLocal<LocalCapsule[]>("time_capsules", []).map((c) => {
        const unlocked = new Date(c.unlock_at).getTime() <= t;
        return { ...c, is_unlocked: unlocked, content: unlocked ? c.content : null, attachment_path: unlocked ? c.attachment_path : null };
      }).sort((a, b) => a.unlock_at.localeCompare(b.unlock_at)));
      setLoading(false);
      return;
    }
    // Sealed messages are filtered by the database: list_time_capsules() returns null content until unlock_at.
    const { data, error: err } = await getSupabase()!.rpc("list_time_capsules");
    if (err) toast(err.message, "error"); else setItems((data as Capsule[]) ?? []);
    setLoading(false);
  }, [mode, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      if (items.some((c) => !c.is_unlocked && new Date(c.unlock_at) <= new Date())) load();
    }, 1000);
    return () => clearInterval(t);
  }, [items, load]);

  const validate = () => {
    if (!form.content.trim()) return "Write your message first.";
    if (!form.unlock) return "Choose when it should open.";
    if (new Date(form.unlock) <= new Date()) return "The unlock time has to be in the future.";
    return null;
  };

  const lock = async () => {
    const values = { title: form.title.trim() || "A message for later", content: form.content, unlock_at: new Date(form.unlock).toISOString(), attachment_path: form.photo[0] ?? null };
    if (mode === "preview") {
      writeLocal("time_capsules", [...readLocal<LocalCapsule[]>("time_capsules", []), { id: uid(), author_id: userId!, created_at: new Date().toISOString(), ...values }]);
    } else {
      const { error: err } = await getSupabase()!.from("time_capsules").insert(values);
      if (err) { setError(err.message); setConfirming(false); return; }
    }
    setConfirming(false); setOpen(false);
    setForm({ title: "", content: "", unlock: "", photo: [] });
    toast("Sealed. Not even you can open it before then.", "success");
    load();
  };

  const minDate = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <div>
      <PageHeader title="Time capsule" subtitle="Write to your future selves. Once sealed, a message can’t be read or changed by anyone until the day it opens." action={<Button onClick={() => { setError(null); setOpen(true); }}><Plus className="h-4 w-4" /> Seal a message</Button>} />

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={<Hourglass className="h-8 w-8" />} title="No capsules yet" body="Write something for your second anniversary, or for a random Tuesday next year." action={<Button onClick={() => setOpen(true)}>Seal a message</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const left = countdown(new Date(c.unlock_at), now);
            return (
              <motion.button key={c.id} whileHover={{ y: -4 }} onClick={() => (c.is_unlocked ? setReading(c) : toast(`Opens ${formatDate(c.unlock_at)}`))}
                className="glass flex flex-col items-start gap-3 rounded-[22px] p-6 text-left">
                <span className={`grid h-12 w-12 place-items-center rounded-full ${c.is_unlocked ? "bg-blush/90 text-midnight" : "bg-deep text-lilac"}`}>
                  {c.is_unlocked ? <LockOpen className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </span>
                <span className="font-display text-xl">{c.title}</span>
                <span className="text-sm text-lilac">From {c.author_id === userId ? "you" : nameOf(c.author_id)}, sealed {formatDate(c.created_at)}</span>
                {c.is_unlocked ? (
                  <span className="text-sm text-blush">Open now</span>
                ) : (
                  <span className="num font-display text-2xl text-cream">
                    {left.days}d {String(left.hours).padStart(2, "0")}h {String(left.minutes).padStart(2, "0")}m {String(left.seconds).padStart(2, "0")}s
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
      <p className="mt-8 text-xs text-lilac/70">Titles and unlock dates are visible to both of you. Messages and photos stay sealed in the database until they open.</p>

      <Modal open={open} onClose={() => { setOpen(false); setConfirming(false); }} title={confirming ? "Seal it?" : "A message for later"}>
        {confirming ? (
          <div className="space-y-4">
            <p className="text-lilac">After sealing, this message can’t be edited, deleted or read by either of you until <span className="text-cloud">{formatDate(new Date(form.unlock).toISOString(), { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>.</p>
            <div className="flex gap-2"><Button variant="soft" className="flex-1" onClick={() => setConfirming(false)}>Keep editing</Button><Button className="flex-1" onClick={lock}><Lock className="h-4 w-4" /> Seal it</Button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Title" hint="Visible on the capsule before it opens"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="For our second anniversary" /></Field>
            <Field label="Message"><TextArea className="min-h-[180px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
            <Field label="Opens on"><Input type="datetime-local" min={minDate} value={form.unlock} onChange={(e) => setForm({ ...form, unlock: e.target.value })} /></Field>
            <ImagePicker value={form.photo} onChange={(photo) => setForm({ ...form, photo })} folder="capsules" />
            <ErrorNote message={error} />
            <Button className="w-full" onClick={() => { const v = validate(); setError(v); if (!v) setConfirming(true); }}>Continue</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!reading} onClose={() => setReading(null)} title={reading?.title ?? ""}>
        {reading && (
          <div className="paper space-y-4 rounded-2xl p-6">
            <p className="text-sm text-[#6b5a86]">Written {formatDate(reading.created_at)}, opened {formatDate(reading.unlock_at)}</p>
            <p className="whitespace-pre-line font-hand text-2xl leading-snug">{reading.content}</p>
            {reading.attachment_path && <MediaImage path={reading.attachment_path} alt="" className="w-full rounded-xl" />}
          </div>
        )}
      </Modal>
    </div>
  );
}
