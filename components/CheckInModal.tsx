"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Heart,
  Luggage,
  MapPin,
  Plane,
  Sparkles,
  UserCheck,
  X
} from "lucide-react";
import { buildGoogleCalendarLinks } from "@/lib/calendar";
import { Button } from "@/components/ui";

export interface CheckInData {
  seat: string;
  memory: string;
  firstStop: string;
  timeSlot?: string;
  checkedInAt: string;
}

export const TIME_SLOT_OPTIONS = [
  {
    label: "14:00 to 16:00",
    name: "14:00 to 16:00",
    sub: "Afternoon Date",
    icon: "☀️"
  },
  {
    label: "21:00 to 23:00",
    name: "21:00 to 23:00",
    sub: "Late Night Orbit",
    icon: "🌙"
  },
  {
    label: "Both (can’t get enough of you)",
    name: "Both",
    sub: "Can't get enough of you 💕",
    icon: "✨"
  }
];

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: CheckInData) => Promise<boolean>;
  initialData?: CheckInData | null;
}

const SEAT_OPTIONS = [
  { label: "Beside you", icon: "💺", desc: "Right next to you, where I belong." },
  { label: "Window seat, holding your hand", icon: "🪟", desc: "Watching stars with our fingers intertwined." },
  { label: "Wherever the snacks are", icon: "🥨", desc: "As long as we're sharing everything." }
];

const STOP_OPTIONS = [
  { label: "A spontaneous day out", icon: "🚗", desc: "No destination, just the two of us and good music." },
  { label: "A cosy night in", icon: "🕯️", desc: "Blankets, movies, and nowhere else to be." },
  { label: "A trip somewhere new", icon: "✈️", desc: "Packing bags for a place we've never explored." },
  { label: "Surprise me", icon: "🎁", desc: "You plan it all—I trust you completely." }
];

export function CheckInModal({ open, onClose, onComplete, initialData }: CheckInModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [seat, setSeat] = useState<string>(initialData?.seat || SEAT_OPTIONS[0].label);
  const [memory, setMemory] = useState<string>(initialData?.memory || "");
  const [firstStop, setFirstStop] = useState<string>(initialData?.firstStop || STOP_OPTIONS[0].label);
  const [timeSlot, setTimeSlot] = useState<string>(initialData?.timeSlot || TIME_SLOT_OPTIONS[2].label);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const selectedSlot = timeSlot || TIME_SLOT_OPTIONS[2].label;
    const data: CheckInData = {
      seat: seat || "Beside me",
      memory: memory.trim(),
      firstStop: firstStop || "A spontaneous day out",
      timeSlot: selectedSlot,
      checkedInAt: new Date().toISOString()
    };

    // Reserve a tab during the click so browsers allow navigation after the save.
    const calendarTab = window.open("about:blank", "_blank");
    if (calendarTab) calendarTab.opener = null;

    try {
      if (!(await onComplete(data))) {
        calendarTab?.close();
        return;
      }
      const [calendar] = buildGoogleCalendarLinks({
        slot: selectedSlot,
        destination: data.firstStop,
        memory: data.memory,
        seat: data.seat
      });
      if (calendarTab && !calendarTab.closed) calendarTab.location.replace(calendar.href);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center safe-modal-x sm:items-center sm:p-6">
      {/* Dark backdrop with celestial blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-midnight/85 backdrop-blur-md"
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-lg max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-1rem))] overflow-y-auto overscroll-contain rounded-t-[28px] pb-[env(safe-area-inset-bottom)] sm:rounded-[28px] border border-lilac/30 bg-[#251B38] text-cloud shadow-2xl"
      >
        {/* Airline Top Banner */}
        <div className="flex items-center justify-between border-b border-lilac/15 bg-gradient-to-r from-midnight via-[#30214B] to-midnight px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blush">
            <Plane className="h-4 w-4" />
            <span>Our Little Universe • Flight ILU-16 Check-in</span>
          </div>
          <button
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-lilac hover:bg-cloud/10 hover:text-cloud transition"
            aria-label="Close check-in"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator breadcrumb */}
        <div className="flex border-b border-lilac/10 bg-midnight/40 px-6 py-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step >= 1 ? "bg-blush text-midnight" : "bg-cloud/15 text-lilac"
              }`}
            >
              1
            </span>
            <span className={step === 1 ? "font-semibold text-cloud" : "text-lilac"}>Seat</span>
          </div>
          <div className="mx-3 flex items-center text-lilac/40">→</div>
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step >= 2 ? "bg-blush text-midnight" : "bg-cloud/15 text-lilac"
              }`}
            >
              2
            </span>
            <span className={step === 2 ? "font-semibold text-cloud" : "text-lilac"}>Carry-on</span>
          </div>
          <div className="mx-3 flex items-center text-lilac/40">→</div>
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step >= 3 ? "bg-blush text-midnight" : "bg-cloud/15 text-lilac"
              }`}
            >
              3
            </span>
            <span className={step === 3 ? "font-semibold text-cloud" : "text-lilac"}>Destination</span>
          </div>
        </div>

        {/* Dynamic Step Content */}
        <div className="p-6 sm:p-7">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blush/15 px-3 py-0.5 text-xs font-semibold text-blush">
                    <UserCheck className="h-3.5 w-3.5" /> Ritual 1 of 3
                  </span>
                  <h3 className="mt-2 font-display text-2xl sm:text-3xl text-cloud">
                    Where are you sitting for our next orbit?
                  </h3>
                  <p className="mt-1 text-sm text-lilac">
                    Passenger Yukku, your boarding position is being confirmed for Year Two.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {SEAT_OPTIONS.map((opt) => {
                    const isSelected = seat === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setSeat(opt.label)}
                        className={`group flex w-full items-start gap-3.5 rounded-2xl p-4 text-left transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-blush/25 to-lilac/25 border-2 border-blush shadow-glow"
                            : "bg-midnight/50 border border-lilac/15 hover:border-lilac/40 hover:bg-midnight/70"
                        }`}
                      >
                        <span className="text-2xl" aria-hidden="true">
                          {opt.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base text-cloud group-hover:text-blush transition-colors">
                            {opt.label}
                          </p>
                          <p className="text-xs text-lilac mt-0.5">{opt.desc}</p>
                        </div>
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-blush bg-blush text-midnight"
                              : "border-lilac/40 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    className="bg-blush text-midnight hover:brightness-110 font-medium"
                  >
                    Next: Pack Carry-on <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blush/15 px-3 py-0.5 text-xs font-semibold text-blush">
                    <Luggage className="h-3.5 w-3.5" /> Ritual 2 of 3
                  </span>
                  <h3 className="mt-2 font-display text-2xl sm:text-3xl text-cloud">
                    Pack our funniest memory in your carry-on
                  </h3>
                  <p className="mt-1 text-sm text-lilac">
                    What is the funniest or most hilarious moment of our first year that always makes you laugh?
                  </p>
                </div>

                <div className="pt-2">
                  <div className="relative rounded-2xl border border-lilac/25 bg-midnight/60 p-3 focus-within:border-blush transition">
                    <textarea
                      maxLength={500}
                      rows={4}
                      value={memory}
                      onChange={(e) => setMemory(e.target.value)}
                      placeholder="That goofy inside joke, the time we couldn’t stop laughing, or something completely unhinged..."
                      className="w-full resize-none bg-transparent font-hand text-xl text-cream placeholder:font-sans placeholder:text-sm placeholder:text-lilac/40 focus:outline-none"
                    />
                  </div>

                  {/* Quick tap shortcut */}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setMemory("The time we laughed so hard our stomachs hurt 😂")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-lilac/30 bg-cloud/5 px-3 py-1 text-xs text-lilac hover:bg-cloud/10 hover:text-cloud transition"
                    >
                      <Sparkles className="h-3 w-3 text-gold" /> Or tap: &ldquo;The time we couldn&apos;t stop laughing 😂&rdquo;
                    </button>
                    <span className="text-[11px] text-lilac/60">Optional</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="text-lilac hover:text-cloud"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    className="bg-blush text-midnight hover:brightness-110 font-medium"
                  >
                    Next: Year Two <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* 1. Anniversary Date Time • 16 November (Placed at the top) */}
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-0.5 text-xs font-semibold text-gold">
                    <Clock className="h-3.5 w-3.5" /> Ritual 3 of 3
                  </span>
                  <h3 className="mt-2 font-display text-2xl sm:text-3xl text-cloud">
                    Anniversary date time • 16 November
                  </h3>
                  <p className="mt-1 text-sm text-lilac">
                    Choose when we celebrate together. Google Calendar opens after check-in. If you choose both times, the evening link is on your boarding pass.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {TIME_SLOT_OPTIONS.map((slot) => {
                    const isSelected = timeSlot === slot.label;
                    return (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => setTimeSlot(slot.label)}
                        className={`group flex flex-col items-start gap-1 rounded-2xl p-2.5 text-left transition-all ${
                          isSelected
                            ? "bg-gradient-to-br from-gold/25 via-blush/25 to-lilac/25 border-2 border-gold shadow-glow"
                            : "bg-midnight/50 border border-lilac/15 hover:border-lilac/40 hover:bg-midnight/70"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg" aria-hidden="true">{slot.icon}</span>
                          {isSelected && (
                            <span className="rounded-full bg-gold/20 p-0.5 text-gold">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-xs text-cloud group-hover:text-gold transition-colors">
                          {slot.label}
                        </p>
                        <p className="text-[10px] text-lilac leading-tight">{slot.sub}</p>
                      </button>
                    );
                  })}
                </div>

                {/* 2. What should we do first in year two? (Placed below anniversary date time) */}
                <div className="pt-3 border-t border-lilac/15">
                  <h3 className="font-display text-2xl sm:text-3xl text-cloud">
                    What should we do first in year two?
                  </h3>
                  <p className="mt-1 text-sm text-lilac">
                    Pick our first stop on our journey to A Lifetime of Love.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {STOP_OPTIONS.map((opt) => {
                    const isSelected = firstStop === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setFirstStop(opt.label)}
                        className={`group flex flex-col items-start gap-1.5 rounded-2xl p-3.5 text-left transition-all ${
                          isSelected
                            ? "bg-gradient-to-br from-blush/25 to-lilac/25 border-2 border-blush shadow-glow"
                            : "bg-midnight/50 border border-lilac/15 hover:border-lilac/40 hover:bg-midnight/70"
                        }`}
                      >
                        <span className="text-2xl" aria-hidden="true">
                          {opt.icon}
                        </span>
                        <p className="font-semibold text-xs sm:text-sm text-cloud group-hover:text-blush transition-colors">
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-lilac leading-relaxed">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="text-lilac hover:text-cloud"
                  >
                    Back
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    onClick={handleFinish}
                    className="bg-gradient-to-r from-blush via-gold to-lilac text-midnight font-bold shadow-glow hover:brightness-110"
                  >
                    <Calendar className="h-4 w-4 mr-1 text-midnight" />
                    {isSubmitting ? "Saving check-in…" : "Check in & open Calendar"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

