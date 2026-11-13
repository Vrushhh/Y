"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { Calendar, ExternalLink, Heart, Luggage, MapPin, Music2, Sparkles, UserCheck } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { useCollection, type Row } from "@/lib/useCollection";
import type { CheckInData } from "@/components/CheckInModal";
import { buildGoogleCalendarLinks } from "@/lib/calendar";

type Song = Row & { title: string; artist?: string | null; external_url?: string | null; is_favourite: boolean };
type Letter = Row & { title: string; content: string; letter_type: string; is_draft: boolean };

export function CarryOn({ checkInData }: { checkInData?: CheckInData | null }) {
  const songs = useCollection<Song>("songs", { order: "created_at", ascending: false, realtime: false });
  const tracks = songs.items.filter((item) => !item.is_demo && /^https?:\/\//i.test(item.external_url ?? ""));
  const song = tracks.find((item) => item.is_favourite) ?? tracks[0];

  return (
    <section className="glass space-y-4 rounded-[26px] p-4 sm:p-7 border border-lilac/20 shadow-2xl" aria-labelledby="carry-on">
      <div className="flex items-center justify-between gap-2 border-b border-lilac/15 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blush flex items-center gap-1.5">
            <Luggage className="h-3.5 w-3.5" /> For the journey
          </p>
          <h2 id="carry-on" className="mt-1 font-display text-3xl text-cloud">
            Your carry-on
          </h2>
        </div>
        {checkInData && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
            <UserCheck className="h-3.5 w-3.5" /> Checked In
          </span>
        )}
      </div>

      {/* Check-in Responses Card */}
      {checkInData && (
        <div className="grid gap-3 sm:grid-cols-2 rounded-2xl bg-midnight/60 p-4 border border-lilac/15">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-lilac flex items-center gap-1">
              <Heart className="h-3 w-3 text-blush" /> Confirmed Seat
            </span>
            <p className="break-words font-semibold text-sm text-cream">{checkInData.seat}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-lilac flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blush" /> First Stop (Year Two)
            </span>
            <p className="break-words font-semibold text-sm text-cream">{checkInData.firstStop}</p>
          </div>
          {checkInData.memory && (
            <div className="sm:col-span-2 pt-2 border-t border-lilac/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-gold" /> Packed Funniest Memory
              </span>
              <p className="font-hand text-xl text-cream mt-0.5 leading-snug">
                &ldquo;{checkInData.memory}&rdquo;
              </p>
            </div>
          )}
          {checkInData.timeSlot && (
            <div className="sm:col-span-2 pt-2 border-t border-lilac/10 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gold" /> Date Time (16 November)
                </span>
                <p className="break-words font-semibold text-sm text-cream mt-0.5">{checkInData.timeSlot}</p>
              </div>
              {buildGoogleCalendarLinks({
                  slot: checkInData.timeSlot,
                  destination: checkInData.firstStop,
                  memory: checkInData.memory,
                  seat: checkInData.seat,
                  guests: ["vrushabhcr7@gmail.com", "yuktasoni05@gmail.com"]
                }).map(({ href, label }) => (
                <a key={href} href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/25 transition"
              >
                <Calendar className="h-3.5 w-3.5" /> {label} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo & Soundtrack */}
      <div className="grid gap-4 sm:grid-cols-2">
        <figure className="relative min-h-48 overflow-hidden rounded-2xl border border-lilac/15 bg-midnight/70 shadow-soft">
          <Image
            src="/boarding/yukku-childhood.jpg"
            alt="Yukku’s childhood portrait beside a pink butterfly"
            fill
            sizes="(min-width: 640px) 320px, 90vw"
            style={{ objectFit: "cover", objectPosition: "center 58%", transform: "scale(1.65)", transformOrigin: "43% 48%" }}
          />
        </figure>

        <div className="flex min-w-0 flex-col justify-center gap-2.5 rounded-2xl bg-midnight/70 p-5 border border-lilac/15 shadow-soft">
          <Music2 className="h-6 w-6 text-blush" aria-hidden="true" />
          <div>
            <span className="text-[11px] uppercase tracking-wider text-lilac font-bold">Our Soundtrack</span>
            <h3 className="font-display text-xl text-cloud leading-tight mt-0.5">
              {song?.title ?? "Our next orbit"}
            </h3>
          </div>
          {song ? (
            <>
              {song.artist && <p className="text-xs text-lilac">{song.artist}</p>}
              <a
                href={song.external_url!}
                target="_blank"
                rel="noreferrer"
                className="mt-1 text-xs font-semibold text-blush hover:underline inline-flex items-center gap-1"
              >
                Play our song <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </>
          ) : (
            <audio
              controls
              preload="none"
              src="/audio/next-orbit.wav"
              className="mt-2 w-full"
              aria-label="Play Our next orbit"
            />
          )}
        </div>
      </div>

      <p className="border-t border-lilac/20 pt-4 font-hand text-2xl leading-tight text-cream">
        Yukku, I packed a little of us for the wait. See you at Gate 16.
      </p>
    </section>
  );
}

export function AnniversaryLetter({ headingRef }: { headingRef: RefObject<HTMLHeadingElement> }) {
  const { items, loading, error } = useCollection<Letter>("letters", {
    order: "created_at",
    ascending: false,
    realtime: false
  });
  const letter = items.find(
    (item) => item.letter_type === "anniversary" && !item.is_draft && !item.is_demo && item.content.trim()
  );

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#654367]">
        16 November 2026
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 font-display text-4xl focus:outline-none">
        {letter?.title ?? "Happy anniversary, Yukku"}
      </h1>
      {loading || error ? (
        <p role="status" className="mt-4 text-[#654367]">
          {error ? "The letter couldn’t load. Try opening the ticket again." : "Unfolding your letter…"}
        </p>
      ) : (
        <p className="mt-4 whitespace-pre-wrap font-hand text-2xl leading-snug">
          {letter?.content ??
            "Somewhere between hello and today, you became my favourite person.\n\nA year ago we had no idea how many ordinary days would turn into stories I’d want to keep. I’m glad I get to find out what the next year holds with you.\n\nHappy first anniversary. Save me the seat beside you."}
        </p>
      )}
    </>
  );
}
