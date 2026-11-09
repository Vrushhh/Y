"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Heart, Lock, Luggage, Plane, QrCode, Sparkles, UserCheck } from "lucide-react";
import QRCode from "qrcode";
import { AnniversaryLetter, CarryOn } from "@/components/BoardingPass";
import { CheckInData, CheckInModal } from "@/components/CheckInModal";
import { Envelope } from "@/components/Envelope";
import { Starfield } from "@/components/Starfield";
import { Button } from "@/components/ui";
import { useApp } from "@/components/providers/AppProvider";
import { SITE_URL } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";
import { countdown } from "@/lib/time";

const LIVE_DASHBOARD_URL = `${SITE_URL}/`;

const ISSUED = new Date("2026-11-14T00:00:00+05:30");
const DEPARTURE = new Date("2026-11-16T00:00:00+05:30");

type Stage = "ticket" | "envelope" | "opening" | "letter";

export default function Welcome() {
  const router = useRouter();
  const { mode, ready, userId, relationship, toast } = useApp();
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("ticket");
  const [now, setNow] = useState<Date | null>(null);
  const [localCheckIn, setLocalCheckIn] = useState<CheckInData | null>(null);
  const [accountCheckIn, setAccountCheckIn] = useState<{ userId: string; data: CheckInData | null; failed?: boolean } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const savingCheckIn = useRef(false);
  const localCheckInMode = mode === "preview" || preview !== null;
  const savedAccountCheckIn = accountCheckIn?.userId === userId ? accountCheckIn : null;
  const checkInData = localCheckInMode ? localCheckIn : savedAccountCheckIn?.data ?? null;
  const checkInLoading = !ready || (!localCheckInMode && !!userId && !savedAccountCheckIn);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [stubTorn, setStubTorn] = useState(false);
  const envelopeButton = useRef<HTMLButtonElement>(null);
  const letterHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("boarding-preview");
    if (p) setPreview(p);
  }, []);

  useEffect(() => {
    if (!localCheckInMode) return;
    const key = mode === "preview" ? "olu:checkin" : "olu:checkin-dev";
    try {
      const stored = localStorage.getItem(key);
      setLocalCheckIn(stored ? JSON.parse(stored) : preview === "carry-on" ? {
        seat: "Window seat, holding your hand",
        memory: "Watching the night sky together and talking until morning.",
        firstStop: "A cosy night in",
        checkedInAt: ISSUED.toISOString()
      } : null);
    } catch {
      setLocalCheckIn(null);
    }
  }, [localCheckInMode, mode, preview]);

  useEffect(() => {
    if (localCheckInMode || !userId) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await getSupabase()!.from("user_preferences")
          .select("boarding_checkin").eq("user_id", userId).maybeSingle();
        if (error) throw error;
        if (active) setAccountCheckIn({ userId, data: data?.boarding_checkin ?? null });
      } catch {
        if (active) setAccountCheckIn({ userId, data: null, failed: true });
      }
    })();
    return () => { active = false; };
  }, [localCheckInMode, userId]);

  // Generate scannable QR Code redirecting to the main website dashboard
  useEffect(() => {
    QRCode.toDataURL(LIVE_DASHBOARD_URL, {
      margin: 1,
      width: 140,
      color: {
        dark: "#211a36",
        light: "#00000000" // transparent background
      }
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code error:", err));
  }, []);

  // Preview and time tick logic
  useEffect(() => {
    const offset =
      preview === "carry-on" || preview === "checkin"
        ? ISSUED.getTime() - Date.now() + 60_000
        : preview === "departure"
        ? DEPARTURE.getTime() - Date.now() + 60_000
        : preview === "pre-checkin"
        ? ISSUED.getTime() - Date.now() - 86_400_000
        : 0;

    const tick = () => setNow(new Date(Date.now() + offset));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [preview]);

  useEffect(() => {
    if (stage !== "opening") return;
    const timeout = window.setTimeout(() => setStage("letter"), reducedMotion ? 0 : 850);
    return () => window.clearTimeout(timeout);
  }, [stage, reducedMotion]);

  const boarding = now !== null && now >= DEPARTURE;
  const issued = now !== null && now >= ISSUED;
  const signedOut = mode === "supabase" && !userId;
  const left = now ? countdown(issued ? DEPARTURE : ISSUED, now) : null;

  const handleCheckInComplete = async (data: CheckInData) => {
    if (savingCheckIn.current) return;
    savingCheckIn.current = true;
    try {
      if (localCheckInMode) {
        localStorage.setItem(mode === "preview" ? "olu:checkin" : "olu:checkin-dev", JSON.stringify(data));
        setLocalCheckIn(data);
      } else {
        if (!userId) throw new Error("Sign in before checking in.");
        const sb = getSupabase()!;
        const { error } = await sb.from("user_preferences")
          .upsert({ user_id: userId, boarding_checkin: data }, { onConflict: "user_id" });
        if (error) throw error;
        setAccountCheckIn({ userId, data });

        // Also save to shared letters table so partner dashboard can display her funniest memory!
        try {
          const payload = JSON.stringify(data);
          const { data: existing } = await sb.from("letters").select("id").eq("title", "Yukku's Carry-on Memory").maybeSingle();
          if (existing?.id) {
            await sb.from("letters").update({ content: payload }).eq("id", existing.id);
          } else {
            await sb.from("letters").insert({
              title: "Yukku's Carry-on Memory",
              content: payload,
              letter_type: "anniversary",
              is_draft: false
            });
          }
        } catch (e) {
          console.warn("Could not sync shared carry-on memory:", e);
        }
      }
      localStorage.setItem("olu:checkin", JSON.stringify(data));
      setCheckInModalOpen(false);
    } catch {
      toast("Your check-in couldn’t be saved. Please try again.", "error");
    } finally {
      savingCheckIn.current = false;
    }
  };

  const board = () => {
    if (!boarding || !ready) return;
    if (signedOut) {
      router.push("/login?next=%2Fboardingpass");
      return;
    }
    setStubTorn(true);
    setTimeout(() => {
      setStage("envelope");
    }, 600);
  };

  const enter = () => {
    localStorage.setItem("olu:intro-done", "1");
    if (mode === "supabase" && userId && relationship) {
      void getSupabase()
        ?.from("user_preferences")
        .upsert({ user_id: userId, intro_completed: true }, { onConflict: "user_id" })
        .then(() => undefined);
    }
    router.push("/universe");
  };

  const seatLabel = checkInData?.seat || "Beside me";

  const flightDetails = [
    ["Passenger", "Yukku"],
    ["Seat", seatLabel],
    ["From", "Our FAM Beginning"],
    ["To", "A Lifetime of Love"],
    ["Issued", "14 November"],
    ["Departure", "16 November"]
  ] as const;

  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8 sm:py-16">
      <Starfield density={1.3} />

      <AnimatePresence mode="wait" initial={false}>
        {stage === "ticket" ? (
          <motion.div
            key="ticket"
            className="relative w-full max-w-2xl space-y-6"
            exit={{ opacity: 0, y: reducedMotion ? 0 : -18 }}
            transition={{ duration: reducedMotion ? 0 : 0.48 }}
          >
            {/* The Authentic Airline Boarding Pass */}
            <article className="relative overflow-hidden rounded-[28px] bg-cream text-midnight shadow-2xl sm:grid sm:grid-cols-[minmax(0,1fr)_12rem] border border-lilac/30">
              {/* Main Ticket Body */}
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#654367]">
                    <Plane className="h-4 w-4" aria-hidden="true" /> Our Little Universe
                  </div>
                  <span className="rounded-full bg-[#654367]/10 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-[#654367]">
                    FLIGHT ILU-16
                  </span>
                </div>

                <h1 className="mt-4 font-display text-[2.65rem] leading-none sm:text-6xl text-midnight font-medium">
                  Boarding pass
                </h1>
                <p className="mt-2 font-romance text-xl italic text-[#654367]">
                  One year down. A whole universe to go.
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-midnight/15 pt-5">
                  {flightDetails.map(([label, value]) => (
                    <div key={label} className={label === "Seat" && checkInData ? "col-span-2 sm:col-span-1" : ""}>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#654367]">
                        {label}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold sm:text-base text-midnight line-clamp-1">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Perforated Tearable Ticket Stub */}
              <motion.aside
                animate={stubTorn ? { x: 120, y: 40, rotate: 20, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeIn" }}
                className="relative flex items-center justify-between gap-4 border-t-2 border-dashed border-midnight/25 bg-[#e9d1e3] px-6 py-5 sm:flex-col sm:justify-center sm:border-l-2 sm:border-t-0 sm:px-4"
                aria-label="Ticket stub"
              >
                {/* Perforation notch dots */}
                <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-midnight sm:-top-2.5" aria-hidden="true" />
                <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-midnight sm:-bottom-2.5 sm:-left-2.5 sm:top-auto" aria-hidden="true" />

                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#654367]">Gate</p>
                  <p className="font-display text-5xl leading-none sm:text-7xl text-midnight font-medium">
                    16
                  </p>
                  {checkInData && (
                    <motion.div
                      initial={reducedMotion ? false : { scale: 1.18, opacity: 0, rotate: -8 }}
                      animate={{ scale: 1, opacity: 1, rotate: -3 }}
                      transition={{ duration: reducedMotion ? 0 : 0.25 }}
                      className="mt-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border-2 border-double border-[#9a2847] bg-cream/50 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a2847]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Checked in
                    </motion.div>
                  )}
                </div>

                {/* Scannable Website QR Code & Barcode (revealed upon check-in completion) */}
                {checkInData ? (
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: reducedMotion ? 0 : 0.3 }}
                    className="flex flex-col items-center gap-1.5 sm:mt-2"
                  >
                    {qrDataUrl ? (
                      <Link
                        href="/"
                        title="Scan or tap to open Our Little Universe website"
                        className="relative block rounded-lg bg-cream/90 p-1.5 shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Image
                          src={qrDataUrl}
                          alt="Scan barcode or tap to open Our Little Universe website"
                          width={76}
                          height={76}
                          className="h-16 w-16 sm:h-20 sm:w-20"
                        />
                      </Link>
                    ) : (
                      <QrCode className="h-16 w-16 text-midnight opacity-40" />
                    )}

                    {/* Flight Barcode Stripes */}
                    <div
                      className="h-6 w-20 opacity-60 rounded-xs"
                      style={{
                        background:
                          "repeating-linear-gradient(90deg, #211a36 0 2px, transparent 2px 4px, #211a36 4px 6px, transparent 6px 9px, #211a36 9px 12px, transparent 12px 14px)"
                      }}
                      aria-hidden="true"
                    />
                    <span className="text-[9px] font-mono tracking-widest text-[#654367] uppercase">
                      Scan to Open
                    </span>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#654367]/30 bg-[#654367]/5 px-3 py-3.5 text-center sm:mt-2 max-w-[10.5rem]">
                    <Lock className="h-4 w-4 text-[#654367]/70" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#654367] leading-tight">
                      QR unlocks after check-in
                    </span>
                  </div>
                )}
              </motion.aside>
            </article>

            {/* Flight & Check-in Status Section */}
            <section aria-label="Boarding status" className="glass rounded-[26px] p-6 text-center border border-lilac/20 shadow-xl space-y-4">
              {boarding ? (
                /* Departure Day (16 November) */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blush/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blush">
                      <Sparkles className="h-3.5 w-3.5" /> Flight ILU-16 is Now Boarding
                    </span>
                    <h2 className="font-display text-2xl sm:text-3xl text-cloud">
                      Ready for our next orbit, Yukku?
                    </h2>
                  </div>
                  <Button
                    size="lg"
                    onClick={board}
                    disabled={!ready}
                    className="bg-gradient-to-r from-blush via-gold to-lilac text-midnight font-bold shadow-glow hover:brightness-110 text-base px-8 py-3"
                  >
                    Now boarding <ArrowRight className="h-5 w-5 ml-1.5" aria-hidden="true" />
                  </Button>
                </div>
              ) : issued ? (
                /* Check-in Period (14 November - 16 November) */
                !checkInData ? (
                  /* Screen 1: Online Check-in Available */
                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">
                        <UserCheck className="h-3.5 w-3.5" /> Online Check-in Open
                      </span>
                      <h2 className="font-display text-2xl sm:text-3xl text-cloud">
                        Passenger Yukku, your flight is ready for check-in.
                      </h2>
                      <p className="text-sm text-lilac">
                        Gate <strong className="text-cloud">16</strong> • Seat <strong className="text-cloud">Beside me</strong> • Destination: <strong className="text-cloud">A Lifetime of Love</strong>
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        size="lg"
                        disabled={checkInLoading || savedAccountCheckIn?.failed}
                        onClick={() => {
                          if (signedOut && !localCheckInMode) router.push("/login?next=%2Fboardingpass");
                          else setCheckInModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-blush via-gold to-lilac text-midnight font-bold shadow-glow hover:brightness-110 text-base px-8 py-3"
                      >
                        <Plane className="h-5 w-5 mr-2" /> Check in for our next orbit
                      </Button>
                    </div>

                    {savedAccountCheckIn?.failed && (
                      <p role="alert" className="text-sm text-blush">Your check-in couldn’t load. Reload the ticket to try again.</p>
                    )}

                    <div className="pt-2 border-t border-lilac/10 text-xs text-lilac flex items-center justify-center gap-2">
                      <span>Departure in:</span>
                      <span className="font-mono font-bold text-cloud">
                        {left ? `${left.days}d ${String(left.hours).padStart(2, "0")}h ${String(left.minutes).padStart(2, "0")}m ${String(left.seconds).padStart(2, "0")}s` : "—"}
                      </span>
                      <span>• 16 November Midnight IST</span>
                    </div>
                  </div>
                ) : (
                  /* Screen 5: Checked In Complete with Carry-on Reveal */
                  <div className="space-y-3 py-1">
                    <div className="flex items-center justify-center gap-2 text-emerald-300 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4" /> You&apos;re checked in, Yukku
                    </div>
                    <p className="text-sm text-lilac">
                      Your carry-on is packed and ready. Boarding begins in:
                    </p>
                    <p role="timer" className="num font-display text-3xl sm:text-4xl text-cream font-medium">
                      {left ? `${left.days}d ${String(left.hours).padStart(2, "0")}h ${String(left.minutes).padStart(2, "0")}m ${String(left.seconds).padStart(2, "0")}s` : "—"}
                    </p>
                    <p className="text-xs text-lilac/80">16 November • Midnight IST</p>

                    <div className="pt-2">
                      <button
                        onClick={() => setCheckInModalOpen(true)}
                        className="text-xs text-lilac hover:text-cloud hover:underline transition"
                      >
                        Review or update check-in answers
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* Pre-checkin (Before 14 November) */
                <div className="space-y-2 py-2">
                  <p className="text-xs uppercase tracking-wider text-lilac font-bold">Online Check-in Opens in</p>
                  <p role="timer" className="num font-display text-3xl sm:text-4xl text-cream font-medium">
                    {left ? `${left.days}d ${String(left.hours).padStart(2, "0")}h ${String(left.minutes).padStart(2, "0")}m ${String(left.seconds).padStart(2, "0")}s` : "—"}
                  </p>
                  <p className="text-xs text-lilac">14 November • Midnight IST</p>
                </div>
              )}
            </section>

            {/* Carry-on section revealed after check-in */}
            {issued && !boarding && checkInData && (
              ready && (!signedOut || localCheckInMode) ? (
                <CarryOn checkInData={checkInData} />
              ) : (
                ready && (
                  <Link
                    href="/login?next=%2Fboardingpass"
                    className="block rounded-[24px] border border-lilac/30 bg-cloud/5 p-5 text-center text-blush hover:bg-cloud/10 transition"
                  >
                    Sign in to open your carry-on <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
                  </Link>
                )
              )
            )}
          </motion.div>
        ) : stage !== "letter" ? (
          /* Envelope Screen */
          <motion.div
            key="envelope"
            className="flex flex-col items-center gap-7 text-center"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
            onAnimationComplete={() => envelopeButton.current?.focus()}
          >
            <p className="font-display text-2xl italic text-lilac">
              Happy first anniversary, Yukku.
            </p>
            <button
              ref={envelopeButton}
              onClick={() => setStage("opening")}
              aria-label="Open the envelope"
              disabled={stage === "opening"}
              className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush focus-visible:ring-offset-8 focus-visible:ring-offset-midnight transition-transform hover:scale-105"
            >
              <Envelope open={stage === "opening"} glow />
            </button>
            <p className="text-sm text-lilac">Tap the envelope to open</p>
          </motion.div>
        ) : (
          /* Anniversary Letter Screen */
          <motion.article
            key="letter"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            onAnimationComplete={() => letterHeading.current?.focus()}
            className="paper w-full max-w-xl rounded-[26px] px-7 py-9 text-midnight shadow-2xl sm:px-11 border-2 border-[#654367]/20"
          >
            <AnniversaryLetter headingRef={letterHeading} />
            <div className="mt-8 border-t border-midnight/15 pt-6 text-center">
              <Button
                size="lg"
                onClick={enter}
                className="bg-gradient-to-r from-blush via-gold to-lilac text-midnight font-bold shadow-glow hover:brightness-110 px-8 py-3 text-base"
              >
                Enter our universe <ArrowRight className="h-5 w-5 ml-1.5" aria-hidden="true" />
              </Button>
            </div>
          </motion.article>
        )}
      </AnimatePresence>

      {/* 3-Question Check-in Ritual Modal */}
      <CheckInModal
        open={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        onComplete={handleCheckInComplete}
        initialData={checkInData}
      />
    </main>
  );
}
