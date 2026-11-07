"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Star, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { authorOf, useCollection, type Row } from "@/lib/useCollection";
import { Button, DemoBadge, ErrorNote, IconButton, Modal, PageHeader, Spinner, TextArea } from "@/components/ui";

type Reason = Row & { content: string; is_favourite: boolean; read_by: string[] };
const GOAL = 365;

export default function Reasons() {
  const { userId, nameOf, toast } = useApp();
  const { items, loading, add, update, remove } = useCollection<Reason>("reasons", { order: "created_at" });
  const [picked, setPicked] = useState<Reason | null>(null);
  const [shaking, setShaking] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const unread = items.filter((r) => !r.read_by?.includes(userId ?? ""));
  // Notes settle in layers from the bottom of the jar (interior spans x 36–164, y 70–246)
  const notes = useMemo(() => Array.from({ length: Math.min(items.length, 30) }, (_, i) => {
    const row = Math.floor(i / 5), col = i % 5;
    return {
      x: 38 + col * 22 + ((row % 2) * 8) + ((i * 7) % 4),
      y: 230 - row * 14 - ((i * 13) % 5),
      r: ((i * 47) % 40) - 20,
      hue: ["#F8E8D8", "#E8B9D0", "#C9BCE8", "#F4EAF5"][i % 4]
    };
  }), [items.length]);

  const draw = () => {
    if (!items.length) return;
    setShaking(true);
    setTimeout(() => {
      const pool = unread.length ? unread : items;
      setPicked(pool[Math.floor(Math.random() * pool.length)]);
      setShaking(false);
    }, 650);
  };

  const markRead = async (r: Reason) => {
    if (!userId || r.read_by?.includes(userId)) return;
    await update(r.id, { read_by: [...(r.read_by ?? []), userId] });
  };

  const save = async () => {
    if (!text.trim()) return setError("Write a reason first.");
    if (text.length > 500) return setError("Keep it under 500 characters.");
    if (await add({ content: text.trim(), is_favourite: false, read_by: [] })) {
      setText(""); setOpen(false); toast("Dropped into the jar", "success");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Jar of reasons" subtitle="One reason at a time. It doesn’t need to be full on day one." action={<Button variant="soft" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add a reason</Button>} />

      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col items-center">
          <motion.button
            onClick={draw} aria-label="Take a reason from the jar"
            animate={shaking ? { rotate: [0, -6, 6, -4, 4, 0] } : { rotate: 0 }} transition={{ duration: 0.6 }}
            className="relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70 rounded-[40px]"
          >
            <div className="absolute -inset-12 rounded-full bg-blush/15 blur-3xl animate-glow" aria-hidden />
            <svg viewBox="0 0 200 260" className="relative h-[340px] w-auto sm:h-[400px]">
              <defs>
                <linearGradient id="glass" x1="0" x2="1">
                  <stop offset="0" stopColor="#F4EAF5" stopOpacity="0.22" /><stop offset="0.5" stopColor="#F4EAF5" stopOpacity="0.06" /><stop offset="1" stopColor="#F4EAF5" stopOpacity="0.2" />
                </linearGradient>
                <clipPath id="jar"><path d="M40 60 Q30 70 30 90 L30 230 Q30 250 50 250 L150 250 Q170 250 170 230 L170 90 Q170 70 160 60 Z" /></clipPath>
              </defs>
              <rect x="52" y="22" width="96" height="26" rx="8" fill="#8D78B5" />
              <rect x="56" y="18" width="88" height="8" rx="4" fill="#C9BCE8" />
              <path d="M58 48 L142 48 L160 60 L40 60 Z" fill="url(#glass)" stroke="#C9BCE8" strokeOpacity="0.4" />
              <g clipPath="url(#jar)">
                {notes.map((n, i) => (
                  <motion.g key={i} animate={{ y: [0, -2.5, 0] }} transition={{ duration: 4 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}>
                    <rect x={n.x} y={n.y} width="26" height="16" rx="3" fill={n.hue} opacity="0.92" transform={`rotate(${n.r} ${n.x + 13} ${n.y + 8})`} />
                  </motion.g>
                ))}
              </g>
              <path d="M40 60 Q30 70 30 90 L30 230 Q30 250 50 250 L150 250 Q170 250 170 230 L170 90 Q170 70 160 60 Z" fill="url(#glass)" stroke="#C9BCE8" strokeOpacity="0.5" strokeWidth="1.5" />
              <path d="M44 90 L44 220" stroke="#F4EAF5" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </motion.button>
          <p className="mt-6 text-center">
            <span className="num font-display text-4xl text-cream">{items.length}</span>
            <span className="text-lilac"> of {GOAL} reasons</span>
          </p>
          <div className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-cloud/10"><div className="h-full bg-gradient-to-r from-blush to-lilac" style={{ width: `${Math.min(100, (items.length / GOAL) * 100)}%` }} /></div>
          <p className="mt-3 text-sm text-lilac">{items.length ? `${unread.length} you haven’t read yet. Tap the jar.` : "The jar is empty. Add the first reason."}</p>
        </div>

        <div className="min-h-[260px]">
          <AnimatePresence mode="wait">
            {picked ? (
              <motion.div key={picked.id}
                initial={{ opacity: 0, y: 80, rotate: -8, scale: 0.6 }} animate={{ opacity: 1, y: 0, rotate: -1.5, scale: 1 }} exit={{ opacity: 0, y: -30 }}
                transition={{ type: "spring", damping: 18, stiffness: 160 }}
                className="paper relative mx-auto max-w-md rounded-md p-8"
              >
                <motion.div initial={{ scaleY: 0.1 }} animate={{ scaleY: 1 }} transition={{ delay: 0.15, duration: 0.4 }} style={{ transformOrigin: "top" }}>
                  <p className="font-hand text-3xl leading-snug">{picked.content}</p>
                  <p className="mt-6 text-sm text-[#6b5a86]">From {nameOf(authorOf(picked))} <DemoBadge show={picked.is_demo} /></p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="!text-[#4d3f66]" onClick={() => { markRead(picked); draw(); }}><Check className="h-4 w-4" /> Read, draw another</Button>
                    <IconButton label={picked.is_favourite ? "Remove from favourites" : "Add to favourites"} className="!text-[#4d3f66]" onClick={() => { update(picked.id, { is_favourite: !picked.is_favourite }); setPicked({ ...picked, is_favourite: !picked.is_favourite }); }}>
                      <Star className="h-4 w-4" fill={picked.is_favourite ? "currentColor" : "none"} />
                    </IconButton>
                    {authorOf(picked) === userId && (
                      <IconButton label="Delete reason" className="!text-[#4d3f66]" onClick={async () => { if (confirm("Remove this reason?") && (await remove(picked.id))) setPicked(null); }}><Trash2 className="h-4 w-4" /></IconButton>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-romance text-xl italic text-lilac">Tap the jar to unfold a reason.</motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {items.some((r) => r.is_favourite) && (
        <section className="mt-16">
          <h2 className="mb-4 font-display text-2xl">Favourite reasons</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.filter((r) => r.is_favourite).map((r) => <div key={r.id} className="paper rounded-md p-5"><p className="font-hand text-xl">{r.content}</p></div>)}
          </div>
        </section>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="A new reason">
        <div className="space-y-4">
          <TextArea autoFocus className="paper !border-0 font-hand !text-2xl" value={text} onChange={(e) => setText(e.target.value)} placeholder="I love you because…" maxLength={500} />
          <ErrorNote message={error} />
          <Button className="w-full" onClick={save}>Drop it in the jar</Button>
        </div>
      </Modal>
    </div>
  );
}
