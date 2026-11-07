"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { ImagePicker, MediaImage } from "@/components/MediaInputs";
import { Button, Field, Input, PageHeader, Select, TextArea } from "@/components/ui";
import { resolveMediaUrl, uploadMedia, useMediaUrl } from "@/lib/media";
import { makeOneSecondFilm } from "@/lib/one-second";
import { useCollection, type Row } from "@/lib/useCollection";
import { formatDate } from "@/lib/time";

type Clip = Row & { author_id: string; clip_date: string; video_path: string };
type Answer = Row & { author_id: string; week_start: string; answer: string };
type Memory = Row & { title: string; memory_date: string | null; image_paths: string[] };
type Recreation = Row & { title: string; then_path: string; then_date: string; now_path: string; now_date: string };
const PROMPTS = [
  "What’s one small thing I did this week that made you feel loved?",
  "What ordinary moment with me would you live again?",
  "What’s something we could make more time for together?",
  "What made you think of me when we were apart?",
  "What’s one little adventure you’d like us to try?",
  "What did you appreciate about us this week?"
];
const DAY = 86_400_000;
const UTC_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

function useToday() {
  const [today, setToday] = useState("");
  useEffect(() => {
    const tick = () => {
      const parts = Object.fromEntries(UTC_DATE.formatToParts(new Date()).map(({ type, value }) => [type, value]));
      setToday([parts.year, parts.month, parts.day].join("-"));
    };
    tick();
    const interval = setInterval(tick, 15_000);
    return () => clearInterval(interval);
  }, []);
  return today;
}

export default function OurDays() {
  const { mode, relationship } = useApp();
  const today = useToday();

  return (
    <div>
      <PageHeader title="Our days" subtitle="Little things from the days we share." />
      {mode === "preview" ? (
        <p className="glass rounded-2xl p-6 text-lilac">Connect your private universe to save and share clips, answers, and photos.</p>
      ) : relationship && today && (
        <div className="space-y-8" key={relationship.id}>
          <OneSecond today={today} />
          <WeeklyQuestion today={today} />
          <ThenAndNow today={today} />
        </div>
      )}
    </div>
  );
}

function ClipPlayer({ path }: { path: string }) {
  const url = useMediaUrl(path);
  return url ? <video controls playsInline preload="metadata" src={url} className="w-full rounded-xl bg-midnight" /> : <p className="text-sm text-lilac">Loading clip…</p>;
}

function OneSecond({ today }: { today: string }) {
  const { mode, userId, relationship, nameOf } = useApp();
  const clips = useCollection<Clip>("daily_seconds", { order: "clip_date" });
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [film, setFilm] = useState<{ url: string; ext: string; month: string } | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => () => { if (film) URL.revokeObjectURL(film.url); }, [film]);

  const monthClips = clips.items.filter((clip) => clip.clip_date.startsWith(month))
    .sort((a, b) => a.clip_date.localeCompare(b.clip_date) || a.author_id.localeCompare(b.author_id));
  const dayClips = clips.items.filter((clip) => clip.clip_date === date);
  const alreadyAdded = dayClips.some((clip) => clip.author_id === userId);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  const run = async (label: string, task: (signal: AbortSignal) => Promise<void>) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setError("");
    setStatus(label);
    try { await task(controller.signal); }
    catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
    finally { active.current = null; if (!controller.signal.aborted) setStatus(""); }
  };

  const addClip = (file: File) => run("Making your one-second clip…", async (signal) => {
    const source = URL.createObjectURL(file);
    try {
      const clip = await makeOneSecondFilm([source], signal);
      signal.throwIfAborted();
      const path = await uploadMedia(clip, { mode, relationshipId: relationship?.id, folder: "daily-seconds" });
      if (!await clips.add({ relationship_id: relationship!.id, clip_date: date, video_path: path })) {
        throw new Error("The clip couldn’t be saved. Reload the calendar before trying again.");
      }
    } finally {
      URL.revokeObjectURL(source);
    }
  });

  const makeFilm = () => run("Stitching your monthly film. Keep this tab open…", async (signal) => {
    const sources = await Promise.all(monthClips.map((clip) => resolveMediaUrl(clip.video_path)));
    if (sources.some((src) => !src)) throw new Error("A clip couldn’t load. Try again.");
    const result = await makeOneSecondFilm(sources as string[], signal);
    signal.throwIfAborted();
    setFilm({ url: URL.createObjectURL(result), ext: result.type.includes("mp4") ? "mp4" : "webm", month });
  });

  return (
    <section id="one-second" className="glass scroll-mt-6 space-y-4 rounded-[22px] p-5 sm:p-7">
      <h2 className="font-display text-3xl">One Second of Us</h2>
      <p className="text-sm text-lilac">One clip each per day. We’ll keep the first second and leave the sound out of the film.</p>
      <Field label="Calendar month">
        <Input type="month" value={month} max={today.slice(0, 7)} disabled={!!status} onChange={(e) => {
          if (!e.target.value || e.target.value > today.slice(0, 7)) return;
          setMonth(e.target.value);
          setDate(e.target.value === today.slice(0, 7) ? today : e.target.value + "-01");
          setFilm(null);
        }} />
      </Field>
      <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day} className="py-1 text-xs text-lilac">{day}</span>)}
        {Array.from({ length: first }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const value = `${month}-${String(i + 1).padStart(2, "0")}`;
          const count = monthClips.filter((clip) => clip.clip_date === value).length;
          return (
            <button key={value} type="button" aria-pressed={date === value} disabled={!!status || value > today}
              aria-label={`${formatDate(value)}, ${count} clips`} onClick={() => setDate(value)}
              className={`rounded-lg p-1.5 text-sm disabled:opacity-40 ${date === value ? "bg-blush text-midnight" : "bg-cloud/5 hover:bg-cloud/15"}`}>
              {i + 1}<span aria-hidden="true" className="block h-3 text-xs">{count ? "●".repeat(count) : ""}</span>
            </button>
          );
        })}
      </div>
      <h3 className="font-display text-xl">{formatDate(date)}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {dayClips.map((clip) => <figure key={clip.id}><ClipPlayer path={clip.video_path} /><figcaption className="mt-1 text-sm text-lilac">{nameOf(clip.author_id)}</figcaption></figure>)}
      </div>
      {clips.error ? <p role="alert" className="text-blush">The calendar couldn’t load. Try refreshing.</p> : alreadyAdded ? (
        <p className="text-sm text-lilac">Your second is saved for this day.</p>
      ) : (
        <Field label="Record or upload your second">
          <Input type="file" accept="video/*" capture="environment" disabled={clips.loading || !!status || !userId} onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void addClip(file);
          }} />
        </Field>
      )}
      <div className="border-t border-lilac/20 pt-4">
        <Button onClick={makeFilm} disabled={!!status || !monthClips.length || month >= today.slice(0, 7)}>Make monthly film</Button>
        <p className="mt-2 text-xs text-lilac">{month >= today.slice(0, 7) ? "The monthly film opens on the first day of next month." : `${monthClips.length} clips from this month.`}</p>
        {film && <div className="mt-4 space-y-2"><video controls playsInline src={film.url} className="w-full max-w-lg rounded-xl" /><a href={film.url} download={`one-second-of-us-${film.month}.${film.ext}`} className="text-sm text-blush underline">Download our film</a></div>}
      </div>
      {status && <p role="status" className="text-sm text-lilac">{status}</p>}
      {error && <p role="alert" className="text-sm text-blush">{error}</p>}
    </section>
  );
}

function WeeklyQuestion({ today }: { today: string }) {
  const { userId, relationship, nameOf } = useApp();
  const { items, loading, error, add, refresh } = useCollection<Answer>("weekly_answers", { realtime: false });
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const date = new Date(`${today}T00:00:00Z`);
  const monday = date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY;
  const week = new Date(monday).toISOString().slice(0, 10);
  const prompt = PROMPTS[Math.floor(monday / (7 * DAY)) % PROMPTS.length];
  const own = items.find((item) => item.week_start === week && item.author_id === userId);
  const partner = items.find((item) => item.week_start === week && item.author_id !== userId);

  useEffect(() => {
    if (!own || partner) return;
    const interval = setInterval(() => { if (!document.hidden) void refresh(); }, 10_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [own, partner, refresh]);

  return (
    <section id="weekly-question" className="glass scroll-mt-6 space-y-4 rounded-[22px] p-5 sm:p-7">
      <h2 className="font-display text-3xl">Same Question, Two Answers</h2>
      <p className="text-xs text-lilac">Week of {formatDate(week)} · New question each Monday</p>
      <p className="font-romance text-xl italic text-cream">{prompt}</p>
      {error ? <p role="alert" className="text-blush">The answers couldn’t load. Try refreshing.</p> : loading ? (
        <p className="text-lilac">Opening this week’s question…</p>
      ) : own && partner ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[own, partner].map((item) => <article key={item.id} className="rounded-xl bg-cloud/5 p-4"><h3 className="mb-2 font-display text-xl text-blush">{nameOf(item.author_id)}</h3><p className="whitespace-pre-wrap break-words">{item.answer}</p></article>)}
        </div>
      ) : own ? <p role="status" className="text-lilac">Your answer is saved. Both answers will appear here after your person replies.</p> : (
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim() || !relationship || saving) return;
          setSaving(true);
          try { if (await add({ relationship_id: relationship.id, week_start: week, answer: draft.trim() })) setDraft(""); }
          finally { setSaving(false); }
        }}>
          <Field label="Your answer"><TextArea maxLength={1000} required value={draft} onChange={(e) => setDraft(e.target.value)} /></Field>
          <Button type="submit" loading={saving} disabled={!draft.trim()}>Seal my answer</Button>
        </form>
      )}
    </section>
  );
}

function ThenAndNow({ today }: { today: string }) {
  const { relationship } = useApp();
  const memories = useCollection<Memory>("memories", { order: "memory_date", realtime: false });
  const recreations = useCollection<Recreation>("photo_recreations", { order: "created_at", ascending: false });
  const [memoryId, setMemoryId] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photo, setPhoto] = useState<string[]>([]);
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const datedMemories = memories.items.filter((memory) => memory.memory_date && memory.image_paths?.length);
  const selected = datedMemories.find((memory) => memory.id === memoryId);

  return (
    <section id="then-and-now" className="glass scroll-mt-6 space-y-4 rounded-[22px] p-5 sm:p-7">
      <h2 className="font-display text-3xl">Then &amp; Now</h2>
      <p className="text-sm text-lilac">Pick a dated photo from Our Constellation and add its recreation.</p>
      {recreations.error || memories.error ? <p role="alert" className="text-blush">Photos couldn’t load. Try refreshing.</p> : datedMemories.length ? (
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          if (!relationship || !selected?.memory_date || !selected.image_paths[photoIndex] || !photo[0] || saving) return;
          setSaving(true);
          try {
            if (await recreations.add({
              relationship_id: relationship.id, memory_id: selected.id, title: selected.title,
              then_path: selected.image_paths[photoIndex], then_date: selected.memory_date, now_path: photo[0], now_date: date
            })) { setPhoto([]); setMemoryId(""); }
          } finally { setSaving(false); }
        }}>
          <Field label="Constellation memory"><Select value={memoryId} onChange={(e) => { setMemoryId(e.target.value); setPhotoIndex(0); }}>
            <option value="">Choose a memory</option>
            {datedMemories.map((memory) => <option key={memory.id} value={memory.id}>{memory.title} · {formatDate(memory.memory_date)}</option>)}
          </Select></Field>
          {selected && <>
            <div className="flex flex-wrap gap-2">
              {selected.image_paths.map((path, index) => (
                <button type="button" key={`${path}-${index}`} aria-pressed={index === photoIndex} aria-label={`Select original photo ${index + 1}`} onClick={() => setPhotoIndex(index)} className={`rounded-lg p-1 ${index === photoIndex ? "ring-2 ring-blush" : ""}`}>
                  <MediaImage path={path} alt="" className="h-16 w-16 rounded-md object-cover" />
                </button>
              ))}
            </div>
            <Field label="Recreation date"><Input type="date" required min={selected.memory_date ?? undefined} max={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <ImagePicker value={photo} onChange={setPhoto} folder="photo-recreations" label="Add recreated photo" />
            <Button type="submit" loading={saving} disabled={!photo.length}>Save comparison</Button>
          </>}
        </form>
      ) : !memories.loading && <p className="text-sm text-lilac">Add a dated photo in Our Constellation to start a comparison.</p>}
      {recreations.items.map((item) => {
        const days = (Date.parse(item.now_date) - Date.parse(item.then_date)) / DAY;
        return <article key={item.id} className="space-y-2 border-t border-lilac/20 pt-4">
          <h3 className="font-display text-xl">{item.title}</h3>
          <p className="text-sm text-lilac">{days === 0 ? "The same day" : `${days.toLocaleString("en-IN")} ${days === 1 ? "day" : "days"} apart`}</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Then", item.then_path, item.then_date], ["Now", item.now_path, item.now_date]].map(([label, path, taken]) => (
              <figure key={label}><MediaImage path={path} alt={`${label}: ${item.title}`} className="aspect-square w-full rounded-xl bg-midnight object-contain" />
                <figcaption className="mt-1 text-sm text-lilac">{label} · {formatDate(taken)}</figcaption>
              </figure>
            ))}
          </div>
        </article>;
      })}
    </section>
  );
}
