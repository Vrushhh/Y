"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";
import { authorOf, useCollection, type Row } from "@/lib/useCollection";
import { Button, DemoBadge, EmptyState, ErrorNote, Field, IconButton, Input, Modal, PageHeader, Select, Spinner, TextArea } from "@/components/ui";
import { ImagePicker, MediaAudio, MediaImage, VoiceInput } from "@/components/MediaInputs";
import { formatDate } from "@/lib/time";

type Event = Row & {
  title: string; description?: string | null; event_date: string; category: string;
  image_path?: string | null; video_url?: string | null; voice_path?: string | null;
};
const CATS: Record<string, string> = { firsts: "Firsts", dates: "Dates", trips: "Trips", celebrations: "Celebrations", special: "Special moments" };
const blank = { title: "", description: "", event_date: "", category: "special", image: [] as string[], video_url: "", voice: null as string | null };

export default function Timeline() {
  const { nameOf, toast } = useApp();
  const { items, loading, add, update, remove } = useCollection<Event>("timeline_events", { order: "event_date" });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const start = (e?: Event) => {
    setEditing(e ?? null);
    setForm(e ? { title: e.title, description: e.description ?? "", event_date: e.event_date, category: e.category, image: e.image_path ? [e.image_path] : [], video_url: e.video_url ?? "", voice: e.voice_path ?? null } : blank);
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.event_date) return setError("A title and a date are needed.");
    if (form.video_url && !/^https?:\/\//i.test(form.video_url)) return setError("The video link should start with https://");
    setSaving(true);
    const values = { title: form.title.trim(), description: form.description || null, event_date: form.event_date, category: form.category, image_path: form.image[0] ?? null, video_url: form.video_url || null, voice_path: form.voice };
    const ok = editing ? await update(editing.id, { ...values, is_demo: false }) : !!(await add(values));
    setSaving(false);
    if (ok) { setOpen(false); toast(editing ? "Moment updated" : "Moment added", "success"); }
  };

  const shown = items.filter((e) => filter === "all" || e.category === filter);

  return (
    <div>
      <PageHeader title="Our timeline" subtitle="A constellation of moments, in the order they happened." action={<Button onClick={() => start()}><Plus className="h-4 w-4" /> Add a moment</Button>} />
      <div className="mb-8 flex flex-wrap gap-2">
        {["all", ...Object.keys(CATS)].map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={clsx("rounded-full px-4 py-1.5 text-sm", filter === c ? "bg-cloud/15 text-cloud" : "text-lilac hover:bg-cloud/5")} aria-pressed={filter === c}>
            {c === "all" ? "Everything" : CATS[c]}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : shown.length === 0 ? (
        <EmptyState title="No moments here yet" body="Start with the day it all began." action={<Button onClick={() => start()}>Add a moment</Button>} />
      ) : (
        <ol className="relative">
          {/* constellation line */}
          <div className="absolute bottom-4 left-[11px] top-4 w-px bg-gradient-to-b from-blush/60 via-lilac/40 to-transparent sm:left-1/2" aria-hidden />
          {shown.map((e, i) => (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}
              className={clsx("relative mb-10 pl-10 sm:w-1/2 sm:pl-0", i % 2 ? "sm:ml-auto sm:pl-12" : "sm:pr-12 sm:text-right")}
            >
              <span className={clsx("absolute top-2 grid h-6 w-6 place-items-center", "left-0 sm:left-auto", i % 2 ? "sm:-left-3" : "sm:-right-3")} aria-hidden>
                <span className="h-3 w-3 rotate-45 bg-cream shadow-[0_0_14px_#F8E8D8]" />
              </span>
              <p className="text-sm text-blush">{formatDate(e.event_date)}</p>
              <h3 className="mt-1 font-display text-2xl">{e.title} <DemoBadge show={e.is_demo} /></h3>
              <p className="text-xs text-lilac">{CATS[e.category]}, added by {nameOf(authorOf(e))}</p>
              {e.image_path && <MediaImage path={e.image_path} alt={e.title} className={clsx("mt-3 max-h-72 w-full rounded-2xl object-cover")} />}
              {e.description && <p className="mt-3 whitespace-pre-line leading-relaxed text-cloud/85">{e.description}</p>}
              {e.video_url && <a href={e.video_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blush underline-offset-4 hover:underline">Watch the video</a>}
              {e.voice_path && <div className="mt-3"><MediaAudio path={e.voice_path} /></div>}
              <div className={clsx("mt-2 flex gap-1", i % 2 ? "" : "sm:justify-end")}>
                <IconButton label="Edit moment" onClick={() => start(e)}><Pencil className="h-4 w-4" /></IconButton>
                <IconButton label="Delete moment" onClick={async () => confirm("Delete this moment?") && (await remove(e.id))}><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            </motion.li>
          ))}
        </ol>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit moment" : "Add a moment"}>
        <div className="space-y-4">
          <Field label="What happened"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></Field>
            <Field label="Kind"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          </div>
          <Field label="The story"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Video link" hint="Optional. A YouTube, Drive or Photos link."><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://" /></Field>
          <ImagePicker value={form.image} onChange={(image) => setForm({ ...form, image })} folder="timeline" />
          <VoiceInput value={form.voice} onChange={(voice) => setForm({ ...form, voice })} />
          <ErrorNote message={error} />
          <Button className="w-full" onClick={save} loading={saving}>{editing ? "Save changes" : "Add to our timeline"}</Button>
        </div>
      </Modal>
    </div>
  );
}
