"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Clock3, Gamepad2, Mail, Music2, Shuffle, Sparkles, Star, Stars, Target } from "lucide-react";
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

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (reasons.items.length) setReasonIdx(Math.floor(Math.random() * reasons.items.length));
  }, [reasons.items.length]);

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
      {/* Hero Welcome Section */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col justify-between gap-8 py-2">
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lilac text-sm font-medium tracking-wide uppercase"
            >
              {greeting}{me ? `, ${me.display_name}` : ""}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mt-2 font-display text-5xl font-light leading-[1.05] text-cloud sm:text-6xl"
            >
              {relationship?.name ?? "Our Little Universe"}
            </motion.h1>
            <p className="mt-3 font-romance italic text-lilac/90 text-lg">Two people. One universe. Infinite memories.</p>
          </div>

          <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
            <div className="text-left [&>div]:text-left">
              <Counter start={startDate} />
            </div>
            {anniversary && left && (
              <div className="pb-1">
                {anniversary.isToday ? (
                  <p className="font-romance text-2xl italic text-blush animate-pulse">
                    Happy {ordinal(anniversary.number)} anniversary! 💕
                  </p>
                ) : (
                  <>
                    <p className="num font-display text-3xl text-cream">
                      {left.days} {left.days === 1 ? "day" : "days"}
                    </p>
                    <p className="text-sm text-lilac">
                      until our {ordinal(anniversary.number)} anniversary,{" "}
                      {formatDate(anniversary.date.toISOString(), { day: "numeric", month: "long" })}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Featured Photo / Gateway Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Link
            href={featured ? "/memories" : "/memories?add=1"}
            className="group relative block aspect-[4/5] overflow-hidden rounded-[28px] border border-lilac/20 sm:aspect-[4/3] lg:aspect-[4/5] shadow-2xl"
          >
            {featured ? (
              <>
                <MediaImage
                  path={featured.image_paths![0]}
                  alt={featured.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/25 to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <p className="font-display text-2xl text-cloud font-medium">{featured.title}</p>
                  <p className="text-sm text-lilac mt-0.5">{featured.location_name}</p>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-deep/60 to-midnight p-8 text-center">
                <div className="h-20 w-20 rounded-full border border-dashed border-lilac/40 flex items-center justify-center text-lilac">
                  <Camera className="h-8 w-8" />
                </div>
                <p className="font-display text-2xl text-cloud">Your favorite photo goes here</p>
                <p className="max-w-xs text-sm text-lilac">Add a memory with a photo to display it here.</p>
              </div>
            )}
          </Link>
        </motion.div>
      </section>

      {/* Experiences Grid */}
      <section aria-label="Experiences" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {EXPERIENCES.map(({ href, title, body, icon: Icon, hue }) => (
          <motion.div
            key={href}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
          >
            <Link
              href={href}
              className="glass glass-hover group flex h-full flex-col gap-4 rounded-[24px] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70 border border-lilac/15"
            >
              <span className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${hue} shadow-soft`}>
                <Icon className="h-5 w-5 text-cloud group-hover:scale-110 transition-transform duration-200" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-cream opacity-0 shadow-[0_0_10px_#F8E8D8] transition-opacity duration-200 group-hover:opacity-100" />
              </span>
              <span>
                <span className="block font-display text-xl leading-tight text-cloud font-medium">{title}</span>
                <span className="mt-1 block text-sm text-lilac/80 leading-relaxed">{body}</span>
              </span>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Activity & Living Content Grid */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Constellation Preview */}
        <div className="glass rounded-[24px] p-6 lg:col-span-2 border border-lilac/15">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-cloud">Our Constellation</h2>
            <Link href="/memories" className="text-sm text-blush hover:underline flex items-center gap-1 font-medium">
              Explore sky →
            </Link>
          </div>
          {memories.items.length === 0 ? (
            <p className="text-sm text-lilac">No stars yet. Place your first moment in the night sky.</p>
          ) : (
            <ul className="divide-y divide-lilac/10">
              {memories.items.slice(0, 4).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 py-3 group">
                  <div className="min-w-0">
                    <p className="truncate text-cloud group-hover:text-blush transition-colors">
                      {m.title} <DemoBadge show={m.is_demo} />
                    </p>
                    <p className="truncate text-sm text-lilac">
                      {[m.location_name, formatDate(m.memory_date)].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <Stars className="h-4 w-4 shrink-0 text-blush/70 group-hover:scale-125 transition-transform" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reasons Jar */}
        <div className="paper relative flex flex-col justify-between rounded-[24px] p-6 shadow-2xl">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#6b5a86] font-bold">From the jar</p>
            <p className="mt-3 font-hand text-2xl leading-snug">
              {reason ? reason.content : "The jar is empty. Drop in your first reason."}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/reasons" className="text-[#6b5a86] underline-offset-4 hover:underline font-medium">
              Open the jar
            </Link>
            {reasons.items.length > 1 && (
              <motion.button
                whileTap={{ rotate: 180, scale: 0.9 }}
                onClick={() =>
                  setReasonIdx((i) => (i + 1 + Math.floor(Math.random() * (reasons.items.length - 1))) % reasons.items.length)
                }
                className="flex items-center gap-1.5 text-[#6b5a86] font-medium hover:text-midnight transition"
                aria-label="Show another reason"
              >
                <Shuffle className="h-4 w-4" /> Another
              </motion.button>
            )}
          </div>
        </div>

        {/* Next on our list */}
        <div className="glass rounded-[24px] p-6 border border-lilac/15">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-cloud">Next on our list</h2>
            <Link href="/bucket-list" className="text-sm text-blush hover:underline font-medium">
              All plans
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-lilac">Nothing planned. Dream something up together.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((g) => (
                <li key={g.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-blush bg-blush/20" />
                  <span className="text-sm text-cloud">
                    {g.title}
                    {g.target_date && (
                      <span className="text-lilac">, by {formatDate(g.target_date, { month: "short", year: "numeric" })}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Soundtrack Preview with Spinning Vinyl */}
        <Link
          href="/soundtrack"
          className="glass glass-hover group flex items-center gap-5 rounded-[24px] p-6 border border-lilac/15"
        >
          <div className="relative h-20 w-20 shrink-0 animate-vinyl rounded-full bg-[repeating-radial-gradient(circle,#1a1430_0_2px,#2a2245_2px_4px)] shadow-soft group-hover:scale-105 transition-transform">
            <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-blush to-lavender flex items-center justify-center">
              <Music2 className="h-4 w-4 text-midnight" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-lilac font-medium">Now in our soundtrack</p>
            <p className="truncate font-display text-xl text-cloud mt-0.5">{song?.title ?? "Add our first song"}</p>
            {song?.artist && <p className="truncate text-sm text-lilac/80">{song.artist}</p>}
          </div>
        </Link>

        {/* Secret Corner Link */}
        <Link
          href="/secret"
          className="glass glass-hover group relative flex items-center gap-4 overflow-hidden rounded-[24px] p-6 border border-lilac/15"
        >
          <motion.div whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 300 }}>
            <Star
              className="h-7 w-7 text-cream transition"
              fill={unlocks.length ? "currentColor" : "none"}
            />
          </motion.div>
          <div>
            <p className="font-display text-xl text-cloud">Secret corner</p>
            <p className="text-sm text-lilac">
              {unlocks.length
                ? `${unlocks.length} surprise${unlocks.length > 1 ? "s" : ""} found`
                : "Tap around to find surprises"}
            </p>
          </div>
          <span className="absolute right-6 top-5 h-2 w-2 animate-ping rounded-full bg-blush/60" aria-hidden />
        </Link>
      </section>

      {partner && <p className="pb-4 text-center text-xs text-lilac/60">Our universe is shared with {partner.display_name}</p>}
    </div>
  );
}
