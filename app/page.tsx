"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Plane } from "lucide-react";
import { AnniversaryLetter, CarryOn } from "@/components/BoardingPass";
import { Envelope } from "@/components/Envelope";
import { Starfield } from "@/components/Starfield";
import { Button } from "@/components/ui";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { countdown } from "@/lib/time";

const ISSUED = new Date("2026-11-14T00:00:00+05:30");
const DEPARTURE = new Date("2026-11-16T00:00:00+05:30");
const FLIGHT_DETAILS = [
  ["Passenger", "Yukku"],
  ["Seat", "Beside me"],
  ["From", "The day we met"],
  ["To", "Our next orbit"],
  ["Issued", "14 November"],
  ["Departure", "16 November"]
] as const;

type Stage = "ticket" | "envelope" | "opening" | "letter";

export default function Welcome() {
  const router = useRouter();
  const { mode, ready, userId, relationship } = useApp();
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("ticket");
  const [now, setNow] = useState<Date | null>(null);
  const envelopeButton = useRef<HTMLButtonElement>(null);
  const letterHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const preview = process.env.NODE_ENV === "development"
      ? new URLSearchParams(window.location.search).get("boarding-preview")
      : null;
    const offset = preview === "carry-on" ? ISSUED.getTime() - Date.now()
      : preview === "departure" ? DEPARTURE.getTime() - Date.now()
      : 0;
    const tick = () => setNow(new Date(Date.now() + offset));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stage !== "opening") return;
    const timeout = window.setTimeout(() => setStage("letter"), reducedMotion ? 0 : 850);
    return () => window.clearTimeout(timeout);
  }, [stage, reducedMotion]);

  const boarding = now !== null && now >= DEPARTURE;
  const issued = now !== null && now >= ISSUED;
  const signedOut = mode === "supabase" && !userId;
  const left = now ? countdown(issued ? DEPARTURE : ISSUED, now) : null;

  const board = () => {
    if (!boarding || !ready) return;
    if (signedOut) {
      router.push("/login?next=%2F");
      return;
    }
    setStage("envelope");
  };

  const enter = () => {
    localStorage.setItem("olu:intro-done", "1");
    if (mode === "supabase" && userId && relationship) {
      void getSupabase()?.from("user_preferences")
        .upsert({ user_id: userId, intro_completed: true }, { onConflict: "user_id" }).then(() => undefined);
    }
    router.push("/universe");
  };

  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8 sm:py-16">
      <Starfield density={1.3} />
      <AnimatePresence mode="wait" initial={false}>
        {stage === "ticket" ? (
          <motion.div key="ticket" className="relative w-full max-w-2xl space-y-5" exit={{ opacity: 0, y: reducedMotion ? 0 : -18 }} transition={{ duration: reducedMotion ? 0 : 0.48 }}>
            <article className="overflow-hidden rounded-[26px] bg-cream text-midnight shadow-soft sm:grid sm:grid-cols-[minmax(0,1fr)_11rem]">
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.19em] text-[#654367]">
                  <Plane className="h-4 w-4" aria-hidden="true" /> Our Little Universe
                </div>
                <h1 className="mt-3 font-display text-[2.65rem] leading-none sm:text-6xl">Boarding pass</h1>
                <p className="mt-2 font-romance text-lg italic text-[#654367]">One year down. A whole universe to go.</p>
                <dl className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-midnight/15 pt-5">
                  {FLIGHT_DETAILS.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#654367]">{label}</dt>
                      <dd className="mt-0.5 text-sm font-semibold sm:text-base">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <motion.aside
                className="relative flex items-center justify-between gap-4 border-t-2 border-dashed border-midnight/25 bg-[#e9d1e3] px-6 py-4 sm:flex-col sm:justify-center sm:border-l-2 sm:border-t-0 sm:px-4"
                exit={reducedMotion ? undefined : { x: 78, y: 35, rotate: 13 }}
                transition={{ duration: reducedMotion ? 0 : 0.45 }}
                aria-label="Ticket stub"
              >
                <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-midnight sm:-top-2" aria-hidden="true" />
                <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-midnight sm:-bottom-2 sm:-left-2 sm:top-auto" aria-hidden="true" />
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-[#654367]">Gate</p>
                  <p className="font-display text-5xl leading-none sm:text-7xl">16</p>
                </div>
                <div className="h-8 w-[4.5rem] opacity-55 sm:mt-2" style={{ background: "repeating-linear-gradient(90deg, #211a36 0 2px, transparent 2px 4px, #211a36 4px 5px, transparent 5px 8px)" }} aria-hidden="true" />
              </motion.aside>
            </article>
            <section aria-label="Boarding status" className="glass rounded-[22px] px-5 py-4 text-center">
              {boarding ? (
                <Button size="lg" onClick={board} disabled={!ready}>Now boarding <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              ) : (
                <>
                  <p className="text-sm text-lilac">{issued ? "Departure in" : "Ticket issues in"}</p>
                  <p role="timer" className="num mt-1 font-display text-3xl text-cream">
                    {left ? `${left.days}d ${String(left.hours).padStart(2, "0")}h ${String(left.minutes).padStart(2, "0")}m ${String(left.seconds).padStart(2, "0")}s` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-lilac">{issued ? "16 November" : "14 November"} · Midnight IST</p>
                </>
              )}
            </section>
            {issued && !boarding && (
              ready && !signedOut ? <CarryOn />
                : ready && <Link href="/login?next=%2F" className="block rounded-[22px] border border-lilac/30 px-5 py-4 text-center text-blush hover:bg-cloud/5">Sign in to open your carry-on <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" /></Link>
            )}
          </motion.div>
        ) : stage !== "letter" ? (
          <motion.div key="envelope" className="flex flex-col items-center gap-7 text-center"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 18 }} onAnimationComplete={() => envelopeButton.current?.focus()}>
            <p className="font-display text-xl italic text-lilac">Happy first anniversary, Yukku.</p>
            <button ref={envelopeButton} onClick={() => setStage("opening")} aria-label="Open the envelope"
              disabled={stage === "opening"} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush focus-visible:ring-offset-8 focus-visible:ring-offset-midnight">
              <Envelope open={stage === "opening"} glow />
            </button>
            <p className="text-sm text-lilac">Tap the envelope</p>
          </motion.div>
        ) : (
          <motion.article key="letter" initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }} animate={{ opacity: 1, y: 0 }}
            onAnimationComplete={() => letterHeading.current?.focus()} className="paper w-full max-w-xl rounded-[22px] px-6 py-8 text-midnight shadow-soft sm:px-10">
            <AnniversaryLetter headingRef={letterHeading} />
            <div className="mt-7 border-t border-midnight/15 pt-5 text-center">
              <Button size="lg" onClick={enter}>Enter our universe <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          </motion.article>
        )}
      </AnimatePresence>
    </main>
  );
}
