"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Delete,
  Heart,
  KeyRound,
  Lock,
  Luggage,
  MapPin,
  Plane,
  RotateCcw,
  Sparkles,
  UserCheck
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { countdown } from "@/lib/time";
import { DEPARTURE, useBoardingClock } from "@/lib/boarding-clock";
import { Button } from "@/components/ui";

type GateStatus = { checkedIn: boolean; letterOpened: boolean; nextStart: string | null; slotOpen: boolean; unlocked: boolean };

interface CarryOnData {
  seat?: string;
  memory?: string;
  firstStop?: string;
  timeSlot?: string;
  checkedInAt?: string;
}

export function UniverseGate({
  children,
  onLockChange
}: {
  children: ReactNode;
  onLockChange?: (locked: boolean) => void;
}) {
  const { email, mode, userId, refresh: refreshAccount } = useApp();
  const isSonu = email === "vrushabhcr7@gmail.com";
  const entry = useSearchParams()?.get("from");
  const fromBoardingPass = entry === "boarding-pass";
  const fromLetter = entry === "letter";
  const now = useBoardingClock();
  const [checkInData, setCheckInData] = useState<CarryOnData | null>(null);
  const canPreview = isSonu || mode === "preview";
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);
  const [status, setStatus] = useState<{ userId: string; data: GateStatus | null } | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [previewGate, setPreviewGate] = useState<string | null>(null);
  const [sonuPreviewMode, setSonuPreviewMode] = useState(false);

  // Check query params for testing: ?test-gate=nov14 | nov16-morning | slot | reset-pin=1 | as=yukta
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const testGateParam = canPreview ? params.get("test-gate") : null;
    const asYukta = canPreview && (params.get("as") === "yukta" || Boolean(testGateParam));

    if (asYukta) setSonuPreviewMode(true);
    setPreviewGate(testGateParam);

    setCheckInData(null);
    if (mode === "preview" || asYukta) {
      try {
        const stored = localStorage.getItem(mode === "preview" ? "olu:checkin" : "olu:checkin-dev");
        if (stored) setCheckInData(JSON.parse(stored));
      } catch {}
    }
    if (!userId) return;
    let active = true;
    getSupabase()?.from("user_preferences").select("boarding_checkin").eq("user_id", userId).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data?.boarding_checkin) setCheckInData(data.boarding_checkin);
      });
    return () => { active = false; };
  }, [canPreview, mode, userId, fromBoardingPass]);

  const simulated = mode === "preview" || (isSonu && sonuPreviewMode && !fromBoardingPass && !fromLetter);
  const showAdminDashboard = isSonu && !sonuPreviewMode && !fromBoardingPass;
  const liveStatus = status?.userId === userId ? status?.data : null;
  const statusFailed = status?.userId === userId && !status?.data;

  useEffect(() => {
    if (mode !== "supabase" || !userId || showAdminDashboard || simulated) return;
    let active = true;
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const { data, error } = await getSupabase()!.rpc("anniversary_gate_status");
        if (active) setStatus({ userId, data: error ? null : data as GateStatus });
      } catch {
        if (active) setStatus({ userId, data: null });
      } finally {
        busy = false;
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 3_000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [userId, mode, showAdminDashboard, simulated]);

  const effectiveNow =
    simulated && previewGate === "nov14" ? new Date("2026-11-14T15:00:00+05:30") :
    simulated && previewGate === "nov16-morning" ? new Date("2026-11-16T09:30:00+05:30") :
    simulated && previewGate === "slot" ? new Date("2026-11-16T21:30:00+05:30") : now;
  const previewSlot = new Date(checkInData?.timeSlot?.startsWith("21:00") ?
    "2026-11-16T21:00:00+05:30" : "2026-11-16T14:00:00+05:30");
  const slotStartTime = simulated ? previewSlot : liveStatus?.nextStart ? new Date(liveStatus.nextStart) : null;
  const slotOpen = simulated ? !!effectiveNow && effectiveNow >= previewSlot : liveStatus?.slotOpen;
  const gateStage = !effectiveNow || effectiveNow < DEPARTURE ? "nov14-to-nov16" :
    slotOpen ? "slot-pin-gate" : "nov16-to-slot";
  const gateUnlocked = simulated ? isUnlocked && slotOpen : !!liveStatus?.unlocked;
  const effectiveLocked = !showAdminDashboard && !gateUnlocked;

  useEffect(() => {
    onLockChange?.(effectiveLocked);
  }, [effectiveLocked, onLockChange]);

  const handleDigit = async (digit: string) => {
    if (checkingPin || gateStage !== "slot-pin-gate" || pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setPinError("");
    if (nextPin.length !== 4) return;

    setCheckingPin(true);
    try {
      const result = simulated ? "ok" : (await getSupabase()!.rpc("anniversary_try_pin", { pin: nextPin })).data;
      if (result === "ok") {
        if (simulated) setIsUnlocked(true);
        else if (userId) {
          setStatus((current) => current?.data && current.userId === userId ?
            { userId, data: { ...current.data, unlocked: true } } : current);
          void refreshAccount();
        }
      } else {
        setPin("");
        setPinError(
          result === "wait" ? "Too many attempts. Try again in 15 minutes." :
          result === "wrong" ? "That orbit PIN didn’t match. Try again." :
          result === "locked" ? "The PIN is available during your reserved slot." :
          "Couldn’t verify the PIN. Please try again."
        );
      }
    } catch {
      setPin("");
      setPinError("Couldn’t verify the PIN. Please try again.");
    } finally {
      setCheckingPin(false);
    }
  };

  const handleBackspace = () => {
    if (checkingPin) return;
    setPin((prev) => prev.slice(0, -1));
    setPinError("");
  };

  const handleClear = () => {
    if (checkingPin) return;
    setPin("");
    setPinError("");
  };

  // Physical keyboard support for PIN
  useEffect(() => {
    if (gateStage !== "slot-pin-gate" || gateUnlocked) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // If Sonu is viewing and not in preview mode, show full dashboard with admin preview bar
  if (showAdminDashboard) {
    return (
      <>
        <div className="fixed top-[calc(0.5rem+env(safe-area-inset-top))] right-[calc(0.5rem+env(safe-area-inset-right))] z-50 flex items-center gap-1.5 rounded-full bg-midnight/90 border border-gold/30 px-3 py-1 text-[11px] font-medium text-gold backdrop-blur shadow-lg">
          <span>👑 Sonu Admin Mode</span>
          <button
            type="button"
            onClick={() => setSonuPreviewMode(true)}
            className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-cream hover:bg-gold/25 transition ml-1"
          >
            Preview Yukku’s Gate
          </button>
        </div>
        {children}
      </>
    );
  }

  if (!effectiveNow || (!simulated && userId && !liveStatus)) {
    return <p role="status" className="py-10 text-center text-lilac">
      {statusFailed ? "Couldn’t load your date slot. Retrying…" : "Checking your flight schedule…"}
    </p>;
  }

  if (mode === "supabase" && !userId && effectiveNow >= DEPARTURE) {
    const returnPath = fromBoardingPass ? "/?from=boarding-pass" : fromLetter ? "/?from=letter" : "/";
    return <div className="glass mx-auto max-w-lg rounded-3xl p-6 text-center">
      <Link className="text-blush underline" href={`/login?next=${encodeURIComponent(returnPath)}`}>Sign in to see your anniversary gate</Link>
    </div>;
  }

  if (!simulated && effectiveNow >= DEPARTURE && liveStatus?.checkedIn && !liveStatus.letterOpened) {
    return <div className="glass mx-auto max-w-lg rounded-3xl p-6 text-center">
      <Link className="text-blush underline" href="/boardingpass">Return to your boarding pass and open your anniversary letter</Link>
    </div>;
  }

  if (gateUnlocked) return children;

  if (!simulated && effectiveNow >= DEPARTURE && (!liveStatus?.checkedIn || (!slotOpen && !slotStartTime))) {
    return <div className="glass mx-auto max-w-lg space-y-4 rounded-3xl p-6 text-center">
      <p>{liveStatus?.checkedIn ? "Your reserved date slot has ended." : "Online check-in has closed."} Ask Sonu for help opening your universe.</p>
      <Link className="text-blush underline" href="/boardingpass">View your boarding pass</Link>
    </div>;
  }

  const countdownToMidnight = countdown(DEPARTURE, effectiveNow);
  const countdownToSlot = countdown(slotStartTime ?? effectiveNow, effectiveNow);
  const slotLabel = slotStartTime?.getTime() === previewSlot.getTime() || !slotStartTime
    ? checkInData?.timeSlot ?? "14:00 to 16:00"
    : "21:00 to 23:00";

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-8 text-center text-cloud">
      {/* Test simulation toolbar (for testing Nov 14 -> Nov 16 -> Slot flow) */}
      {canPreview && !fromBoardingPass && <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-midnight/80 border border-lilac/20 p-1.5 text-xs backdrop-blur shadow-md">
        <span className="text-[10px] uppercase font-bold text-lilac/70 px-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-gold" /> Test Timeline:
        </span>
        <button
          type="button"
          onClick={() => {
            setPreviewGate("nov14");
            setIsUnlocked(false);
          }}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
            previewGate === "nov14"
              ? "bg-blush text-midnight"
              : "text-lilac hover:bg-cloud/10"
          }`}
        >
          1. Nov 14 (Countdown to Midnight)
        </button>
        <button
          type="button"
          onClick={() => {
            setPreviewGate("nov16-morning");
            setIsUnlocked(false);
          }}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
            previewGate === "nov16-morning"
              ? "bg-gold text-midnight"
              : "text-lilac hover:bg-cloud/10"
          }`}
        >
          2. Nov 16 Morning (Countdown to Slot)
        </button>
        <button
          type="button"
          onClick={() => {
            setPreviewGate("slot");
            setIsUnlocked(false);
          }}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
            previewGate === "slot" || (!previewGate && gateStage === "slot-pin-gate")
              ? "bg-emerald-400 text-midnight"
              : "text-lilac hover:bg-cloud/10"
          }`}
        >
          3. Date Slot Time (Secret PIN Gate)
        </button>
        {isSonu && (
          <button
            type="button"
            onClick={() => setSonuPreviewMode(false)}
            className="rounded-lg bg-cloud/15 px-2 py-1 text-[10px] text-cream hover:bg-cloud/25 transition ml-1"
          >
            Exit Preview
          </button>
        )}
      </div>}

      {/* STAGE 1: Between Nov 14 (Check-in) and Nov 16 12:00 AM IST */}
      {gateStage === "nov14-to-nov16" && (
        <motion.div
          key="stage1"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="w-full max-w-xl space-y-6 rounded-[32px] border border-lilac/30 bg-[#251B38]/90 p-6 sm:p-9 shadow-2xl backdrop-blur-xl"
        >
          {/* Airline Header */}
          <div className="flex items-center justify-between border-b border-lilac/15 pb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blush/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blush">
              <Plane className="h-3.5 w-3.5" /> Flight ILU-16 • Boarding Gate
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <UserCheck className="h-3.5 w-3.5" /> {checkInData ? "Passenger Checked In" : "Flight ILU-16"}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl text-cloud leading-tight">
              Passenger Yukku, hold onto your boarding pass.
            </h1>
            <p className="text-sm sm:text-base text-lilac">
              Our 1st Anniversary Orbit departs on 16 November at midnight IST. At midnight you can open your letter. The site unlocks at your date slot.
            </p>
          </div>

          {/* Large Countdown Cards */}
          <div className="rounded-2xl bg-midnight/70 border border-lilac/20 p-5 shadow-inner">
            <p className="text-xs font-bold uppercase tracking-widest text-gold mb-3 flex items-center justify-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gold" /> Flight Departure Countdown
            </p>
            <div className="grid grid-cols-4 gap-1 text-center sm:gap-2">
              <div className="rounded-xl bg-[#30214B] p-3 border border-lilac/15">
                <span className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl font-bold text-cream">
                  {countdownToMidnight.days}
                </span>
                <span className="block text-[10px] uppercase font-bold text-lilac mt-1">Days</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-lilac/15">
                <span className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl font-bold text-cream">
                  {countdownToMidnight.hours}
                </span>
                <span className="block text-[10px] uppercase font-bold text-lilac mt-1">Hours</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-lilac/15">
                <span className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl font-bold text-cream">
                  {countdownToMidnight.minutes}
                </span>
                <span className="block text-[10px] uppercase font-bold text-lilac mt-1">Mins</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-lilac/15">
                <span className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl font-bold text-cream">
                  {countdownToMidnight.seconds}
                </span>
                <span className="block text-[10px] uppercase font-bold text-lilac mt-1">Secs</span>
              </div>
            </div>
            <p className="text-[11px] text-lilac/70 mt-3 font-mono">16 November • Midnight IST</p>
          </div>

          {/* Ticket Info Card */}
          <div className="grid grid-cols-2 gap-3 text-left rounded-2xl bg-midnight/50 p-4 border border-lilac/15 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-lilac font-bold block">Seat</span>
              <span className="font-semibold text-cloud text-sm">{checkInData?.seat ?? "Beside me"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-lilac font-bold block">Destination</span>
              <span className="font-semibold text-cloud text-sm">
                {checkInData?.firstStop ?? "A Lifetime of Love"}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/boardingpass"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blush to-gold px-6 py-3.5 text-sm font-bold text-midnight shadow-glow hover:brightness-110 transition"
            >
              <Luggage className="h-4 w-4" /> View Your Boarding Pass & Carry-on ↗
            </Link>
          </div>
        </motion.div>
      )}

      {/* STAGE 2: Nov 16 between 12:00 AM IST and Date Slot Start Time */}
      {gateStage === "nov16-to-slot" && (
        <motion.div
          key="stage2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="w-full max-w-xl space-y-6 rounded-[32px] border border-gold/30 bg-[#251B38]/90 p-6 sm:p-9 shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-lilac/15 pb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">
              <Heart className="h-3.5 w-3.5 fill-gold" /> Happy 1st Anniversary 💕
            </span>
            <span className="text-xs font-mono text-lilac">Flight ILU-16 In Orbit</span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl text-cloud leading-tight">
              Countdown to our anniversary date orbit.
            </h1>
            <p className="text-sm sm:text-base text-lilac">
              Our anniversary is here, Yukku! We celebrate together at{" "}
              <strong className="text-gold">{slotLabel}</strong>. Counting down to our reserved time slot:
            </p>
          </div>

          {/* Date Slot Countdown */}
          <div className="rounded-2xl bg-midnight/70 border border-gold/20 p-5 shadow-inner">
            <p className="text-xs font-bold uppercase tracking-widest text-gold mb-3 flex items-center justify-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gold" /> Reserved Date Slot Countdown
            </p>
            <div className="grid grid-cols-3 gap-3 text-center max-w-sm mx-auto">
              <div className="rounded-xl bg-[#30214B] p-3 border border-gold/20">
                <span className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl font-bold text-cream">
                  {countdownToSlot.hours}
                </span>
                <span className="block text-[10px] uppercase font-bold text-gold mt-1">Hours</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-gold/20">
                <span className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl font-bold text-cream">
                  {countdownToSlot.minutes}
                </span>
                <span className="block text-[10px] uppercase font-bold text-gold mt-1">Minutes</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-gold/20">
                <span className="font-display text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl font-bold text-cream">
                  {countdownToSlot.seconds}
                </span>
                <span className="block text-[10px] uppercase font-bold text-gold mt-1">Seconds</span>
              </div>
            </div>
            <p className="text-xs text-lilac mt-3 font-semibold">
              Slot Time: {slotLabel} • Today in IST
            </p>
          </div>

          {/* Funniest Memory Card */}
          {checkInData?.memory && (
            <div className="rounded-2xl bg-midnight/50 p-4 border border-lilac/15 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-gold" /> Packed Funniest Memory
              </span>
              <p className="font-hand text-xl text-cream mt-1 leading-snug">
                &ldquo;{checkInData.memory}&rdquo;
              </p>
            </div>
          )}

          <div className="pt-2">
            <Link
              href="/boardingpass"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold/20 border border-gold/40 px-6 py-3.5 text-sm font-bold text-gold hover:bg-gold/30 transition"
            >
              <Luggage className="h-4 w-4" /> Open Boarding Pass Ticket ↗
            </Link>
          </div>
        </motion.div>
      )}

      {/* STAGE 3: Secret PIN gate */}
      {gateStage === "slot-pin-gate" && (
        <motion.div
          key="stage3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-md space-y-6 rounded-[32px] border ${
            pinError ? "border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.35)]" : "border-gold/40 shadow-glow"
          } bg-[#251B38]/95 p-6 sm:p-8 backdrop-blur-xl transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-lilac/15 pb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" /> Orbit Slot Active
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
              <Lock className="h-3.5 w-3.5" /> Secret Clearance
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/30 to-blush/20 border border-gold/40 shadow-inner">
              <KeyRound className="h-7 w-7 text-gold" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl text-cloud pt-2">
              Welcome to Our Little Universe
            </h1>
            <p className="text-xs sm:text-sm text-lilac">
              Enter the secret 4-digit orbit PIN to unlock our universe together.
            </p>
          </div>

          {/* Hint Callout */}
          <div className="rounded-xl bg-gold/10 border border-gold/25 p-3 text-xs text-gold flex items-center justify-center gap-2">
            <span>💳</span>
            <span>
              <strong>Hint:</strong> Ask Sonu for your four-digit orbit code
            </span>
          </div>

          {/* 4-Digit PIN Boxes */}
          <div className="flex justify-center gap-3.5 py-1">
            {[0, 1, 2, 3].map((idx) => {
              const digit = pin[idx];
              const isCurrent = pin.length === idx;
              return (
                <motion.div
                  key={idx}
                  animate={pinError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`flex h-14 w-12 items-center justify-center rounded-2xl text-2xl font-bold font-mono transition-all ${
                    digit
                      ? "bg-gradient-to-br from-gold/30 to-blush/30 border-2 border-gold text-cloud shadow-glow"
                      : isCurrent
                      ? "bg-midnight/70 border-2 border-blush/60 text-cloud ring-2 ring-blush/20"
                      : "bg-midnight/50 border border-lilac/25 text-lilac/30"
                  }`}
                >
                  {digit ? "•" : ""}
                </motion.div>
              );
            })}
          </div>

          {/* Status Message */}
          <div className="h-6">
            <AnimatePresence mode="wait">
              {pinError && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-rose-400"
                >
                  {pinError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* On-screen Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(num)}
                disabled={checkingPin}
                className="flex h-12 items-center justify-center rounded-2xl bg-midnight/60 border border-lilac/20 text-lg font-semibold text-cloud hover:bg-midnight hover:border-gold/50 active:scale-95 transition"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={checkingPin}
              className="flex h-12 items-center justify-center rounded-2xl bg-midnight/40 border border-lilac/15 text-xs font-medium text-lilac hover:text-cloud hover:bg-midnight active:scale-95 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigit("0")}
              disabled={checkingPin}
              className="flex h-12 items-center justify-center rounded-2xl bg-midnight/60 border border-lilac/20 text-lg font-semibold text-cloud hover:bg-midnight hover:border-gold/50 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={checkingPin}
              className="flex h-12 items-center justify-center rounded-2xl bg-midnight/40 border border-lilac/15 text-lilac hover:text-rose-400 hover:bg-midnight active:scale-95 transition"
              aria-label="Delete digit"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
