"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Clock3, Gamepad2, Mail, MapPin, Music2, Shuffle, Sparkles, Star, Stars, Target } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { useCollection, type Row } from "@/lib/useCollection";
import { Counter } from "@/components/Counter";
import { MediaImage } from "@/components/MediaInputs";
import { DemoBadge } from "@/components/ui";
import { countdown, formatDate, nextAnniversary, ordinal } from "@/lib/time";

const EXPERIENCES = [
  { href: "/memories", title: "Our Constellation", body: "A custom night sky where every star is a moment.", icon: Stars, hue: "from-[#E8B9D0]/40 to-[#8D78B5]/30" },
  { href: "/date-mode", title: "Two-player date mode", body: "Play from two phones, reveal together.", icon: Gamepad2, hue: "from-[#C9BCE8]/40 to-[#40345C]/40" },
  { href: "/letters", title: "Love letters", body: "Open when you need them.", icon: Mail, hue: "from-[#F8E8D8]/40 to-[#E8B9D0]/25" },
  { href: "/photobooth", title: "Photobooth", body: "Four frames, one strip, one keepsake.", icon: Camera, hue: "from-[#8D78B5]/40 to-[#E8B9D0]/25" },
  { href: "/timeline", title: "Our timeline", body: "A constellation of firsts.", icon: Clock3, hue: "from-[#C9BCE8]/35 to-[#F8E8D8]/20" },
  { href: "/reasons", title: "Jar of reasons", body: "One reason at a time, until 365.", icon: Sparkles, hue: "from-[#E8B9D0]/35 to-[#C9BCE8]/30" },
  { href: "/soundtrack", title: "Our soundtrack", body: "The songs that hold our moments.", icon: Music2, hue: "from-[#40345C]/50 to-[#8D78B5]/35" },
  { href: "/bucket-list", title: "Future together", body: "Everything we haven’t done yet.", icon: Target, hue: "from-[#F8E8D8]/30 to-[#8D78B5]/30" }
];

type Memory = Row & { title: string; location_name?: string; memory_date?: string; image_paths?: string[]; category: string };
type Reason = Row & { content: string };
type Goal = Row & { title: string; completed: boolean; target_date?: string };
type Song = Row & { title: string; artist?: string; is_favourite?: boolean };

export default function Universe() {
  const { me, partner, startDate, relationship, unlocks } = useApp();
  const memories = useCollection<Memory>("memories", { order: "created_at", ascending: false });
  const reasons = useCollection<Reason>("reasons", { realtime: false });
  const goals = useCollection<Goal>("bucket_list", { order: "created_at" });
  const songs = useCollection<Song>("songs", { realtime: false });
  const [reasonIdx, setReasonIdx] = useState(0);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (reasons.items.length) setReasonIdx(Math.floor(Math.random() * reasons.items.length)); }, [reasons.items.length]);

  const anniversary = now ? nextAnniversary(startDate, now) : null;
  const left = anniversary && now ? countdown(anniversary.date, now) : null;
  const featured = useMemo(() => memories.items.find((m) => m.image_paths?.length), [memories.items]);
  const reason = reasons.items[reasonIdx];
  const upcoming = goals.items.filter((g) => !g.completed).slice(0, 3);
  const song = songs.items.find((s) => s.is_favourite) ?? songs.items[0];
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col justify-between gap-8 py-2">
          <div>
            <p className="text-lilac">{greeting}{me ? `, ${me.display_name}` : ""}</p>
            <h1 className="mt-2 font-display text-5xl font-light leading-[1.05] text-cloud sm:text-6xl">
              {relationship?.name ?? "Our Little Universe"}
            </h1>
            <p className="mt-3 font-romance italic text-lilac">Two people. One universe. Infinite memories.</p>
          </div>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
            <div className="text-left [&>div]:text-left"><Counter start={startDate} /></div>
            {anniversary && left && (
              <div className="pb-1">
                {anniversary.isToday ? (
                  <p className="font-romance text-2xl italic text-blush">Happy {ordinal(anniversary.number)} anniversary</p>
                ) : (
                  <>
                    <p className="num font-display text-3xl text-cream">{left.days} {left.days === 1 ? "day" : "days"}</p>
                    <p className="text-sm text-lilac">until our {ordinal(anniversary.number)} anniversary, {formatDate(anniversary.date.toISOString(), { day: "numeric", month: "long" })}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <Link href={featured ? "/memories" : "/memories?add=1"} className="group relative block aspect-[4/5] overflow-hidden rounded-[28px] border border-lilac/15 sm:aspect-[4/3] lg:aspect-[4/5]">
          {featured ? (
            <>
              <MediaImage path={featured.image_paths![0]} alt={featured.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/20 to-transparent" />
              <div className="absolute bottom-0 p-6">
                <p className="font-display text-2xl">{featured.title}</p>
                <p className="text-sm text-lilac">{featured.location_name}</p>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-deep/60 to-midnight p-8 text-center">
              <div className="h-24 w-24 rounded-full border border-dashed border-lilac/40" />
              <p className="font-display text-2xl">Your favourite photo goes here</p>
              <p className="max-w-xs text-sm text-lilac">Add a memory with a photo and it will appear on this page.</p>
            </div>
          )}
        </Link>
      </section>

      <section aria-label="Experiences" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {EXPERIENCES.map(({ href, title, body, icon: Icon, hue }) => (
          <motion.div key={href} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
            <Link href={href} className="glass group flex h-full flex-col gap-4 rounded-[22px] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70">
              <span className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${hue}`}>
                <Icon className="h-5 w-5 text-cloud" />
                <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-cream opacity-0 shadow-[0_0_8px_#F8E8D8] transition group-hover:opacity-100" />
              </span>
              <span>
                <span className="block font-display text-xl leading-tight text-cloud">{title}</span>
                <span className="mt-1 block text-sm text-lilac">{body}</span>
              </span>
            </Link>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-[22px] p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Our Constellation</h2>
            <Link href="/memories" className="text-sm text-blush hover:underline">Explore sky</Link>
          </div>
          {memories.items.length === 0 ? (
            <p className="text-sm text-lilac">No stars yet. Place your first moment in the night sky.</p>
          ) : (
            <ul className="divide-y divide-lilac/10">
              {memories.items.slice(0, 4).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-cloud">{m.title} <DemoBadge show={m.is_demo} /></p>
                    <p className="truncate text-sm text-lilac">{[m.location_name, formatDate(m.memory_date)].filter(Boolean).join(", ")}</p>
                  </div>
                  <Stars className="h-4 w-4 shrink-0 text-blush/70" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="paper relative flex flex-col justify-between rounded-[22px] p-6">
          <div>
            <p className="text-sm text-[#6b5a86]">From the jar</p>
            <p className="mt-3 font-hand text-2xl leading-snug">{reason ? reason.content : "The jar is empty. Drop in the first reason."}</p>
          </div>
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/reasons" className="text-[#6b5a86] underline-offset-4 hover:underline">Open the jar</Link>
            {reasons.items.length > 1 && (
              <button onClick={() => setReasonIdx((i) => (i + 1 + Math.floor(Math.random() * (reasons.items.length - 1))) % reasons.items.length)} className="flex items-center gap-1.5 text-[#6b5a86]" aria-label="Show another reason">
                <Shuffle className="h-4 w-4" /> Another
              </button>
            )}
          </div>
        </div>

        <div className="glass rounded-[22px] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Next on our list</h2>
            <Link href="/bucket-list" className="text-sm text-blush hover:underline">All plans</Link>
          </div>
          {upcoming.length === 0 ? <p className="text-sm text-lilac">Nothing planned. Dream something up.</p> : (
            <ul className="space-y-3">
              {upcoming.map((g) => (
                <li key={g.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-blush" />
                  <span className="text-sm text-cloud">{g.title}{g.target_date && <span className="text-lilac">, by {formatDate(g.target_date, { month: "short", year: "numeric" })}</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link href="/soundtrack" className="glass flex items-center gap-5 rounded-[22px] p-6">
          <div className="relative h-20 w-20 shrink-0 animate-vinyl rounded-full bg-[repeating-radial-gradient(circle,#1a1430_0_2px,#2a2245_2px_4px)] shadow-soft">
            <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-blush to-lavender" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-lilac">Now in our soundtrack</p>
            <p className="truncate font-display text-xl">{song?.title ?? "Add our first song"}</p>
            {song?.artist && <p className="truncate text-sm text-lilac">{song.artist}</p>}
          </div>
        </Link>

        <Link href="/secret" className="glass group relative flex items-center gap-4 overflow-hidden rounded-[22px] p-6">
          <Star className="h-6 w-6 text-cream transition group-hover:rotate-45" fill={unlocks.length ? "currentColor" : "none"} />
          <div>
            <p className="font-display text-xl">Secret corner</p>
            <p className="text-sm text-lilac">{unlocks.length ? `${unlocks.length} surprise${unlocks.length > 1 ? "s" : ""} found` : "Something is hidden up here"}</p>
          </div>
          <span className="absolute right-6 top-5 h-1.5 w-1.5 animate-glow rounded-full bg-blush" aria-hidden />
        </Link>
      </section>

      {partner && <p className="pb-4 text-center text-xs text-lilac/60">Shared with {partner.display_name}</p>}
    </div>
  );
}
