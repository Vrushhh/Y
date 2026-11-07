"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Pause, Play, Plus, Star, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";
import { authorOf, useCollection, type Row } from "@/lib/useCollection";
import { toEmbedUrl } from "@/lib/embed";
import { Button, DemoBadge, EmptyState, ErrorNote, Field, IconButton, Input, Modal, PageHeader, Spinner, TextArea } from "@/components/ui";
import { ImagePicker, MediaImage } from "@/components/MediaInputs";
import { formatDate } from "@/lib/time";

type Song = Row & { title: string; artist?: string | null; artwork_path?: string | null; external_url?: string | null; memory_note?: string | null; is_favourite: boolean };
const blank = { title: "", artist: "", external_url: "", memory_note: "", art: [] as string[] };

export default function Soundtrack() {
  const { nameOf, toast } = useApp();
  const { items, loading, add, update, remove } = useCollection<Song>("songs", { order: "created_at" });
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const current = items.find((s) => s.id === currentId) ?? items[0];
  const embed = toEmbedUrl(current?.external_url);

  const save = async () => {
    if (!form.title.trim()) return setError("Add the song title.");
    if (form.external_url && !/^https?:\/\//i.test(form.external_url)) return setError("Links should start with https://");
    const ok = await add({ title: form.title.trim(), artist: form.artist || null, external_url: form.external_url || null, memory_note: form.memory_note || null, artwork_path: form.art[0] ?? null, is_favourite: false });
    if (ok) { setOpen(false); setForm(blank); toast("Added to our soundtrack", "success"); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Our soundtrack" subtitle="The songs that hold our moments. Paste a Spotify or YouTube link to play it right here." action={<Button variant="soft" onClick={() => { setError(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add a song</Button>} />

      {items.length === 0 ? (
        <EmptyState title="No songs yet" body="Which song was playing the first time it felt like something?" action={<Button onClick={() => setOpen(true)}>Add our first song</Button>} />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className={clsx("relative h-64 w-64 rounded-full bg-[repeating-radial-gradient(circle,#15102a_0_2px,#2a2245_2px_3px)] shadow-[0_30px_60px_rgba(0,0,0,0.5)] sm:h-80 sm:w-80", playing && "animate-vinyl")}>
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_30deg,transparent_0_40%,rgba(255,255,255,0.08)_45%,transparent_50%_90%,rgba(255,255,255,0.06)_95%,transparent)]" />
                <div className="absolute inset-[32%] overflow-hidden rounded-full bg-gradient-to-br from-blush to-lavender">
                  {current?.artwork_path && <MediaImage path={current.artwork_path} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-midnight" />
              </div>
              <motion.div className="absolute -right-6 -top-4 h-36 w-2 origin-top rounded-full bg-gradient-to-b from-lilac to-deep" animate={{ rotate: playing ? 24 : 8 }} aria-hidden />
            </div>
            <div className="text-center">
              <p className="font-display text-3xl">{current?.title}</p>
              <p className="text-lilac">{current?.artist}</p>
              {current?.memory_note && <p className="mx-auto mt-3 max-w-sm font-hand text-xl text-blush">{current.memory_note}</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setPlaying(!playing)} aria-pressed={playing}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pause the record" : "Spin the record"}</Button>
              {current?.external_url && <a href={current.external_url} target="_blank" rel="noreferrer"><Button variant="soft"><ExternalLink className="h-4 w-4" /> Open</Button></a>}
            </div>
            {playing && embed && (
              <iframe title={`Player for ${current?.title}`} src={embed} className="h-[152px] w-full max-w-md rounded-2xl border-0" allow="encrypted-media; picture-in-picture" loading="lazy" />
            )}
            {playing && !embed && <p className="text-xs text-lilac/70">Add a Spotify or YouTube link to play it here. Nothing plays until you press play.</p>}
          </div>

          <ol className="glass divide-y divide-lilac/10 self-start rounded-[22px]">
            {items.map((s, i) => (
              <li key={s.id} className={clsx("flex items-center gap-4 px-5 py-4", s.id === current?.id && "bg-cloud/5")}>
                <span className="num w-5 text-right font-display text-lg text-lilac/60">{i + 1}</span>
                <button className="min-w-0 flex-1 text-left" onClick={() => { setCurrentId(s.id); setPlaying(false); }}>
                  <span className="block truncate text-cloud">{s.title} <DemoBadge show={s.is_demo} /></span>
                  <span className="block truncate text-sm text-lilac">{[s.artist, `added by ${nameOf(authorOf(s))}`, formatDate(s.created_at, { day: "numeric", month: "short" })].filter(Boolean).join(", ")}</span>
                </button>
                <IconButton label={s.is_favourite ? "Remove favourite" : "Favourite"} onClick={() => update(s.id, { is_favourite: !s.is_favourite })}><Star className="h-4 w-4" fill={s.is_favourite ? "currentColor" : "none"} /></IconButton>
                <IconButton label="Remove song" onClick={async () => confirm(`Remove “${s.title}”?`) && (await remove(s.id))}><Trash2 className="h-4 w-4" /></IconButton>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add a song">
        <div className="space-y-4">
          <Field label="Song"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
          <Field label="Artist"><Input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} /></Field>
          <Field label="Link" hint="Spotify and YouTube links play inside the app. Other links open in a new tab."><Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://open.spotify.com/track/…" /></Field>
          <Field label="Why this song"><TextArea className="min-h-[90px]" value={form.memory_note} onChange={(e) => setForm({ ...form, memory_note: e.target.value })} /></Field>
          <ImagePicker value={form.art} onChange={(art) => setForm({ ...form, art })} folder="songs" label="Add artwork" />
          <ErrorNote message={error} />
          <Button className="w-full" onClick={save}>Add to our soundtrack</Button>
        </div>
      </Modal>
    </div>
  );
}
