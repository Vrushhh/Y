"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { authorOf, useCollection, type Row } from "@/lib/useCollection";
import { getSupabase } from "@/lib/supabase/client";
import { Button, DemoBadge, ErrorNote, Field, IconButton, Input, Modal, PageHeader, Select, Spinner, TextArea } from "@/components/ui";
import { Envelope } from "@/components/Envelope";
import { ImagePicker, MediaAudio, MediaImage, VoiceInput } from "@/components/MediaInputs";
import { Typewriter } from "@/components/Typewriter";
import { formatDate } from "@/lib/time";

type Letter = Row & {
  title: string; content: string; letter_type: string; image_path?: string | null; voice_path?: string | null;
  is_favourite: boolean; is_draft: boolean; updated_at?: string;
};

const TYPES: { key: string; label: string; tint: "blush" | "lilac" | "cream" }[] = [
  { key: "anniversary", label: "Our anniversary", tint: "blush" },
  { key: "miss_me", label: "Open when you miss me", tint: "lilac" },
  { key: "sad", label: "Open when you’re sad", tint: "cream" },
  { key: "unsaid", label: "Things I don’t say enough", tint: "blush" },
  { key: "next_chapter", label: "Our next chapter", tint: "lilac" },
  { key: "secret", label: "Secret letter", tint: "cream" }
];
const PLACEHOLDER = "Write it the way you would say it. This is a placeholder until you replace it.";

export default function Letters() {
  const { mode, userId, nameOf, unlocks, toast } = useApp();
  const { items, loading, add, update, remove, refresh } = useCollection<Letter>("letters", { order: "created_at" });
  const [reading, setReading] = useState<Letter | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Letter | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", letter_type: "anniversary", image: [] as string[], voice: null as string | null, is_draft: false });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const secretOpen = unlocks.includes("secret-letter");

  const compose = (type = "anniversary", letter?: Letter) => {
    setEditing(letter ?? null);
    setForm(letter
      ? { title: letter.title, content: letter.content, letter_type: letter.letter_type, image: letter.image_path ? [letter.image_path] : [], voice: letter.voice_path ?? null, is_draft: letter.is_draft }
      : { title: TYPES.find((t) => t.key === type)?.label ?? "", content: "", letter_type: type, image: [], voice: null, is_draft: false });
    setError(null);
    setOpen(true);
  };

  const save = async (asDraft: boolean) => {
    if (!form.title.trim()) return setError("Give the letter a title.");
    if (!asDraft && !form.content.trim()) return setError("The letter is empty. Save it as a draft or write a few lines.");
    setSaving(true);
    const values = { title: form.title.trim(), content: form.content, letter_type: form.letter_type, image_path: form.image[0] ?? null, voice_path: form.voice, is_draft: asDraft };
    const ok = editing ? await update(editing.id, { ...values, is_demo: false }) : !!(await add(values));
    setSaving(false);
    if (ok) { setOpen(false); toast(asDraft ? "Draft saved, only you can see it" : "Letter sealed", "success"); }
  };

  const toggleFav = async (l: Letter) => {
    if (mode === "preview") return update(l.id, { is_favourite: !l.is_favourite });
    const { error: err } = await getSupabase()!.rpc("toggle_letter_favourite", { p_letter: l.id });
    if (err) toast(err.message, "error"); else refresh();
  };

  const openLetter = (l: Letter) => { setReading(l); };
  const favourites = items.filter((l) => l.is_favourite && !l.is_draft);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Love letters" subtitle="Words to keep, and to open exactly when they’re needed." action={<Button onClick={() => compose()}><Plus className="h-4 w-4" /> Write a letter</Button>} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3">
        {TYPES.map((t) => {
          const letters = items.filter((l) => l.letter_type === t.key && l.title !== "Yukku's Carry-on Memory");
          const locked = t.key === "secret" && !secretOpen && !letters.some((l) => authorOf(l) === userId);
          return (
            <div key={t.key} className="flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ y: -6, rotate: -1 }} whileTap={{ scale: 0.97 }}
                onClick={() => (locked ? toast("This one opens after you find the secret in the Secret corner.") : letters[0] ? openLetter(letters[0]) : compose(t.key))}
                className="relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70"
                aria-label={locked ? `${t.label}, locked` : letters[0] ? `Open ${t.label}` : `Write ${t.label}`}
              >
                <Envelope size="sm" tint={t.tint} />
                {locked && <Lock className="absolute right-2 top-2 h-4 w-4 text-midnight/60" />}
                {letters.length > 1 && <span className="absolute -right-2 -top-2 rounded-full bg-blush px-2 text-xs text-midnight">{letters.length}</span>}
              </motion.button>
              <p className="text-center font-hand text-xl text-cloud">{t.label}</p>
              {!locked && letters.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                  {letters.map((l) => (
                    <button key={l.id} onClick={() => openLetter(l)} className="rounded-full bg-cloud/5 px-3 py-1 text-xs text-lilac hover:text-cloud">
                      {l.is_draft ? "Draft: " : ""}{l.title.slice(0, 26)}
                    </button>
                  ))}
                </div>
              )}
              {!locked && letters.length === 0 && <p className="text-xs text-lilac/60">Not written yet</p>}
            </div>
          );
        })}
      </div>

      {favourites.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-3 font-display text-2xl">Favourites</h2>
          <div className="flex flex-wrap gap-2">
            {favourites.map((l) => <button key={l.id} onClick={() => openLetter(l)} className="glass rounded-full px-4 py-2 text-sm"><Star className="mr-1.5 inline h-3.5 w-3.5 text-cream" fill="currentColor" />{l.title}</button>)}
          </div>
        </section>
      )}

      <Modal open={!!reading} onClose={() => setReading(null)} title={reading?.title ?? ""} wide>
        {reading && (
          <div className="space-y-4">
            <div className="paper rounded-2xl px-6 py-8 sm:px-10">
              <div className="mb-4 flex items-center justify-between text-sm text-[#6b5a86]">
                <span>From {nameOf(authorOf(reading))} <DemoBadge show={reading.is_demo} />{reading.is_draft && " (draft, only you can see this)"}</span>
                <span>{formatDate(reading.created_at)}</span>
              </div>
              {seen.has(reading.id) ? (
                <p className="whitespace-pre-line font-hand text-2xl leading-[32px]">{reading.content || PLACEHOLDER}</p>
              ) : (
                <Typewriter text={reading.content || PLACEHOLDER} speed={14} className="whitespace-pre-line font-hand text-2xl leading-[32px]" onDone={() => setSeen((s) => new Set(s).add(reading.id))} />
              )}
              {reading.image_path && <MediaImage path={reading.image_path} alt="" className="mt-6 max-h-80 w-full rounded-xl object-cover" />}
            </div>
            {reading.voice_path && <div><p className="mb-1 text-sm text-lilac">Voice note</p><MediaAudio path={reading.voice_path} /></div>}
            <div className="flex flex-wrap gap-2">
              {!reading.is_draft && (
                <Button variant="soft" size="sm" onClick={() => { toggleFav(reading); setReading({ ...reading, is_favourite: !reading.is_favourite }); }}>
                  <Star className="h-4 w-4" fill={reading.is_favourite ? "currentColor" : "none"} /> {reading.is_favourite ? "Favourited" : "Favourite"}
                </Button>
              )}
              {authorOf(reading) === userId && (
                <>
                  <Button variant="soft" size="sm" onClick={() => { setReading(null); compose(reading.letter_type, reading); }}><Pencil className="h-4 w-4" /> Edit</Button>
                  <IconButton label="Delete letter" onClick={async () => { if (confirm("Delete this letter?") && (await remove(reading.id))) setReading(null); }}><Trash2 className="h-4 w-4" /></IconButton>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit letter" : "Write a letter"} wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind of letter">
              <Select value={form.letter_type} onChange={(e) => setForm({ ...form, letter_type: e.target.value })}>
                {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </Select>
            </Field>
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          </div>
          <Field label="Your letter">
            <TextArea className="paper min-h-[280px] !border-0 font-hand !text-2xl leading-[32px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={PLACEHOLDER} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImagePicker value={form.image} onChange={(image) => setForm({ ...form, image })} folder="letters" />
            <VoiceInput value={form.voice} onChange={(voice) => setForm({ ...form, voice })} />
          </div>
          <ErrorNote message={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="soft" className="flex-1" onClick={() => save(true)} loading={saving}>Save as draft</Button>
            <Button className="flex-1" onClick={() => save(false)} loading={saving}>Seal and share</Button>
          </div>
          <p className="text-xs text-lilac/70">Drafts are visible only to you. A sealed letter appears for both of you.</p>
        </div>
      </Modal>
    </div>
  );
}
