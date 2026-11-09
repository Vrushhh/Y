"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
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
import { countdown } from "@/lib/time";
import { Button } from "@/components/ui";

const ISSUED = new Date("2026-11-14T00:00:00+05:30");
const DEPARTURE_MIDNIGHT = new Date("2026-11-16T00:00:00+05:30");
const CORRECT_PIN = "1101";

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
  const { email, mode } = useApp();
  const [now, setNow] = useState<Date>(new Date());
  const [checkInData, setCheckInData] = useState<CarryOnData | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [previewGate, setPreviewGate] = useState<string | null>(null);
  const [sonuPreviewMode, setSonuPreviewMode] = useState(false);

  // Check query params for testing: ?test-gate=nov14 | nov16-morning | slot
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tg = params.get("test-gate");
    if (tg) setPreviewGate(tg);
    if (params.get("unlock-all") === "1") {
      try {
        localStorage.setItem("olu:pin_unlocked", CORRECT_PIN);
      } catch {}
      setIsUnlocked(true);
    }

    try {
      const savedUnlock = localStorage.getItem("olu:pin_unlocked");
      if (savedUnlock === CORRECT_PIN) {
        setIsUnlocked(true);
      }
    } catch {}

    try {
      const stored = localStorage.getItem("olu:checkin");
      if (stored) {
        setCheckInData(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Real-time clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Compute effective simulated time based on preview mode
  const effectiveNow = useMemo(() => {
    if (previewGate === "nov14") {
      return new Date("2026-11-14T15:00:00+05:30");
    }
    if (previewGate === "nov16-morning") {
      return new Date("2026-11-16T09:30:00+05:30");
    }
    if (previewGate === "slot") {
      return new Date("2026-11-16T14:30:00+05:30");
    }
    return now;
  }, [now, previewGate]);

  // Determine Slot Start Time on 16 November (default 14:00 IST)
  const slotStartTime = useMemo(() => {
    const slot = checkInData?.timeSlot?.toLowerCase() ?? "";
    if (slot.includes("21:00") && !slot.includes("both")) {
      return new Date("2026-11-16T21:00:00+05:30");
    }
    return new Date("2026-11-16T14:00:00+05:30");
  }, [checkInData?.timeSlot]);

  // Gate stages:
  // 1. "nov14-to-nov16": Before Nov 16 12:00 AM IST
  // 2. "nov16-to-slot": On Nov 16 between 12:00 AM IST and slotStartTime
  // 3. "slot-pin-gate": During/after slot time -> Secret PIN prompt
  const gateStage: "nov14-to-nov16" | "nov16-to-slot" | "slot-pin-gate" = useMemo(() => {
    if (effectiveNow < DEPARTURE_MIDNIGHT) {
      return "nov14-to-nov16";
    }
    if (effectiveNow < slotStartTime) {
      return "nov16-to-slot";
    }
    return "slot-pin-gate";
  }, [effectiveNow, slotStartTime]);

  // Is Sonu viewing? (Sonu = vrushabhcr7@gmail.com)
  const isSonu = email === "vrushabhcr7@gmail.com";
  const effectiveLocked = (!isSonu || sonuPreviewMode) && !isUnlocked;

  useEffect(() => {
    onLockChange?.(effectiveLocked);
  }, [effectiveLocked, onLockChange]);

  // Handle PIN input
  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setPinError(false);

    if (nextPin.length === 4) {
      if (nextPin === CORRECT_PIN) {
        setCelebrating(true);
        try {
          localStorage.setItem("olu:pin_unlocked", CORRECT_PIN);
        } catch {}
        setTimeout(() => {
          setIsUnlocked(true);
          setCelebrating(false);
        }, 1200);
      } else {
        setPinError(true);
        setTimeout(() => {
          setPin("");
          setPinError(false);
        }, 1100);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handleClear = () => {
    setPin("");
    setPinError(false);
  };

  // Physical keyboard support for PIN
  useEffect(() => {
    if (gateStage !== "slot-pin-gate" || isUnlocked) return;
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
  if (isSonu && !sonuPreviewMode) {
    return (
      <>
        <div className="fixed top-2 right-2 z-50 flex items-center gap-1.5 rounded-full bg-midnight/90 border border-gold/30 px-3 py-1 text-[11px] font-medium text-gold backdrop-blur shadow-lg">
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

  // If unlocked via PIN (1101), render the unlocked website!
  if (isUnlocked) {
    return (
      <>
        {/* Subtle unlock badge with option to re-lock during tests */}
        <div className="fixed bottom-3 right-3 z-50">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem("olu:pin_unlocked");
              } catch {}
              setIsUnlocked(false);
              setPin("");
            }}
            className="flex items-center gap-1.5 rounded-full bg-midnight/80 border border-lilac/25 px-2.5 py-1 text-[10px] text-lilac/70 hover:text-blush transition backdrop-blur"
            title="Click to re-lock for testing"
          >
            <Lock className="h-3 w-3" /> Re-lock Gate
          </button>
        </div>
        {children}
      </>
    );
  }

  // Countdowns
  const countdownToMidnight = countdown(DEPARTURE_MIDNIGHT, effectiveNow);
  const countdownToSlot = countdown(slotStartTime, effectiveNow);

  const slotLabel = checkInData?.timeSlot ?? "14:00 to 16:00";

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-8 text-center text-cloud">
      {/* Test simulation toolbar (for testing Nov 14 -> Nov 16 -> Slot flow) */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-midnight/80 border border-lilac/20 p-1.5 text-xs backdrop-blur shadow-md">
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
      </div>

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
              <UserCheck className="h-3.5 w-3.5" /> Passenger Checked In
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl text-cloud leading-tight">
              Passenger Yukku, hold onto your boarding pass.
            </h1>
            <p className="text-sm sm:text-base text-lilac">
              Our 1st Anniversary Orbit departs on 16 November at midnight IST. The universe unlocks when our flight takes off.
            </p>
          </div>

          {/* Large Countdown Cards */}
          <div className="rounded-2xl bg-midnight/70 border border-lilac/20 p-5 shadow-inner">
            <p className="text-xs font-bold uppercase tracking-widest text-gold mb-3 flex items-center justify-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gold" /> Flight Departure Countdown
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-[#30214B] p-3 border border-lilac/15">
                <span className="font-display text-3xl sm:text-4xl font-bold text-cream">
                  {countdownToMidnight.days}
                </span>
                <span className="block text-[10px] uppercase font-bold text-lilac mt-1">Days</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-lilac/15">
                <span className="font-display text-3xl sm:text-4xl font-bold text-cream">
                  {countdownToMidnight.hours}
                </span>
                <span className="block text-[10px] uppercase font-bold text-lilac mt-1">Hours</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-lilac/15">
                <span className="font-display text-3xl sm:text-4xl font-bold text-cream">
                  {countdownToMidnight.minutes}
                </span>
                <span className="block text-[10px] uppercase font-bold text-lilac mt-1">Mins</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-lilac/15">
                <span className="font-display text-3xl sm:text-4xl font-bold text-cream">
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
            <h1 className="font-display text-3xl sm:text-4xl text-cloud leading-tight">
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
                <span className="font-display text-3xl sm:text-4xl font-bold text-cream">
                  {countdownToSlot.hours}
                </span>
                <span className="block text-[10px] uppercase font-bold text-gold mt-1">Hours</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-gold/20">
                <span className="font-display text-3xl sm:text-4xl font-bold text-cream">
                  {countdownToSlot.minutes}
                </span>
                <span className="block text-[10px] uppercase font-bold text-gold mt-1">Minutes</span>
              </div>
              <div className="rounded-xl bg-[#30214B] p-3 border border-gold/20">
                <span className="font-display text-3xl sm:text-4xl font-bold text-cream">
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

      {/* STAGE 3: Date Slot Arrived -> Secret PIN Gate (1101) */}
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
              <strong>Hint:</strong> Sonu’s first ATM PIN
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
                  Nice try bubu! Think back to Sonu’s first bank card... 💳💕
                </motion.p>
              )}
              {celebrating && (
                <motion.p
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" /> Welcome home, my favourite person! Unlocking... 💕
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
                disabled={celebrating}
                className="flex h-12 items-center justify-center rounded-2xl bg-midnight/60 border border-lilac/20 text-lg font-semibold text-cloud hover:bg-midnight hover:border-gold/50 active:scale-95 transition"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={celebrating}
              className="flex h-12 items-center justify-center rounded-2xl bg-midnight/40 border border-lilac/15 text-xs font-medium text-lilac hover:text-cloud hover:bg-midnight active:scale-95 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigit("0")}
              disabled={celebrating}
              className="flex h-12 items-center justify-center rounded-2xl bg-midnight/60 border border-lilac/20 text-lg font-semibold text-cloud hover:bg-midnight hover:border-gold/50 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={celebrating}
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
