"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Lock,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button, IconButton, Modal, PageHeader, Spinner } from "@/components/ui";
import {
  formatISTDisplayDate,
  getAuthoritativeTodayReason,
  getCountdownToNextMidnightIST,
  getISTDateString,
  getSequenceNumberForDate,
  isBoyfriendAdmin,
  updateJarStartDate,
  fetchAllReasons,
  fetchJarSettings,
  type JarReason,
  type JarSettings,
  TOTAL_REASONS
} from "@/lib/jar";

export default function ReasonsPage() {
  const { email, me, toast } = useApp();

  const [loading, setLoading] = useState(true);
  const [todayReason, setTodayReason] = useState<JarReason | null>(null);
  const [tomorrowReason, setTomorrowReason] = useState<JarReason | null>(null);
  const [allReasons, setAllReasons] = useState<JarReason[]>([]);
  const [settings, setSettings] = useState<JarSettings | null>(null);
  const [sequence, setSequence] = useState(1);
  const [istDateStr, setIstDateStr] = useState("");
  const [countdownStr, setCountdownStr] = useState("00:00:00");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isBeforeStart, setIsBeforeStart] = useState(false);

  // Note Modal / Interaction state
  const [noteOpen, setNoteOpen] = useState(false);
  const [jarHovered, setJarHovered] = useState(false);

  // Admin states (Boyfriend only)
  const isAdmin = useMemo(() => isBoyfriendAdmin(email, me?.role), [email, me?.role]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewTomorrowOpen, setPreviewTomorrowOpen] = useState(false);

  // Load authoritative today reason and settings
  const loadData = async () => {
    try {
      const sett = await fetchJarSettings();
      setSettings(sett);
      setNewStartDate(sett.start_date);

      const todayData = await getAuthoritativeTodayReason(new Date(), sett.start_date);
      setTodayReason(todayData.reason);
      setSequence(todayData.sequence);
      setIstDateStr(todayData.istDate);
      setIsBeforeStart(todayData.isBeforeStart);
      setIsCompleted(todayData.isCompleted);

      const all = await fetchAllReasons();
      setAllReasons(all);

      // Tomorrow reason calculation
      const tomorrowSeq = Math.min(TOTAL_REASONS, todayData.sequence + 1);
      const tom = all.find((r) => r.sequence_number === tomorrowSeq) || all[0];
      setTomorrowReason(tom);
    } catch (err) {
      console.error("Failed to load jar reasons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Countdown timer to midnight IST (updates every second)
  useEffect(() => {
    const updateCountdown = () => {
      const { formatted } = getCountdownToNextMidnightIST(new Date());
      setCountdownStr(formatted);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save new start date (Admin only)
  const handleSaveStartDate = async () => {
    if (!newStartDate) return;
    setSavingSettings(true);
    const ok = await updateJarStartDate(newStartDate);
    if (ok) {
      toast("Jar start date updated successfully!", "success");
      await loadData();
    } else {
      toast("Failed to update jar start date.", "error");
    }
    setSavingSettings(false);
  };

  // Filtered reasons for Admin search
  const filteredReasons = useMemo(() => {
    if (!searchQuery.trim()) return allReasons;
    const q = searchQuery.toLowerCase();
    return allReasons.filter(
      (r) =>
        r.reason_text.toLowerCase().includes(q) ||
        r.sequence_number.toString() === q.replace(/^#/, "")
    );
  }, [allReasons, searchQuery]);

  // Next 7 days forecast for Admin
  const next7Days = useMemo(() => {
    if (!settings || !allReasons.length) return [];
    const list = [];
    for (let offset = 1; offset <= 7; offset++) {
      const nextSeq = Math.min(TOTAL_REASONS, sequence + offset);
      const r = allReasons.find((item) => item.sequence_number === nextSeq);
      list.push({ offset, sequence: nextSeq, reason: r });
    }
    return list;
  }, [settings, allReasons, sequence]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const paddedSeq = sequence.toString().padStart(3, "0");
  const percentComplete = Math.min(100, Math.round((sequence / TOTAL_REASONS) * 100));

  return (
    <div className="relative pb-24">
      {/* Background ambient celestial glows */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blush/10 via-lilac/10 to-transparent blur-3xl" />

      {/* Page Header */}
      <PageHeader
        title="JARS OF REASONS- WHY i LOVE YOU"
        subtitle="One little reminder, every single day."
        action={
          isAdmin ? (
            <Button
              variant="soft"
              onClick={() => setAdminOpen(true)}
              className="flex items-center gap-2 border border-gold/40 text-gold shadow-glow hover:bg-gold/10"
            >
              <Settings2 className="h-4 w-4 text-gold" />
              <span>Boyfriend Admin</span>
            </Button>
          ) : null
        }
      />

      {/* Main Experience Layout */}
      <div className="mt-4 grid items-center gap-12 lg:grid-cols-12">
        {/* Left / Center Column: Large Interactive Illustrated Glass Jar */}
        <div className="flex flex-col items-center lg:col-span-6 xl:col-span-7">
          <div className="relative flex flex-col items-center">
            {/* Ambient Aura behind Jar */}
            <motion.div
              animate={{
                scale: jarHovered || noteOpen ? [1, 1.08, 1] : [1, 1.03, 1],
                opacity: jarHovered || noteOpen ? 0.35 : 0.2
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-10 rounded-full bg-gradient-to-t from-blush via-gold to-lilac blur-3xl"
              aria-hidden
            />

            {/* Interactive Jar */}
            <motion.button
              onClick={() => setNoteOpen(true)}
              onMouseEnter={() => setJarHovered(true)}
              onMouseLeave={() => setJarHovered(false)}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-[50px] p-2"
              aria-label="Open today's love note from the jar"
            >
              <svg
                viewBox="0 0 240 320"
                className="relative h-[340px] w-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] sm:h-[420px]"
              >
                <defs>
                  {/* Glass refraction gradients */}
                  <linearGradient id="jarGlass" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                    <stop offset="25%" stopColor="#C9BCE8" stopOpacity="0.08" />
                    <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.03" />
                    <stop offset="75%" stopColor="#F8E8D8" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.22" />
                  </linearGradient>

                  {/* Cork / Lid Gradient */}
                  <linearGradient id="lidGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="40%" stopColor="#9C7A14" />
                    <stop offset="100%" stopColor="#684F0A" />
                  </linearGradient>

                  {/* Glowing Paper Note Gradient */}
                  <linearGradient id="paperGlow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFFDF5" />
                    <stop offset="100%" stopColor="#F8E8D8" />
                  </linearGradient>

                  <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Jar Clipping Path for interior notes */}
                  <clipPath id="jarInterior">
                    <path d="M48 76 Q34 88 34 115 L34 275 Q34 305 60 305 L180 305 Q206 305 206 275 L206 115 Q206 88 192 76 Z" />
                  </clipPath>
                </defs>

                {/* Animated Jar Lid (Cork with Gold ribbon) */}
                <motion.g
                  animate={noteOpen ? { y: -28, rotate: -6 } : { y: 0, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <rect x="62" y="24" width="116" height="30" rx="9" fill="url(#lidGradient)" />
                  <rect x="68" y="20" width="104" height="9" rx="4" fill="#F3E5AB" opacity="0.8" />
                  {/* Decorative gold ribbon around the neck */}
                  <rect x="58" y="56" width="124" height="8" rx="3" fill="#D4AF37" opacity="0.9" />
                  <circle cx="120" cy="60" r="4" fill="#FFFDF5" />
                </motion.g>

                {/* Jar Neck */}
                <path
                  d="M60 58 L180 58 L192 76 L48 76 Z"
                  fill="url(#jarGlass)"
                  stroke="#C9BCE8"
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                />

                {/* Jar Interior: Sleeping paper notes & Today's highlighted golden scroll */}
                <g clipPath="url(#jarInterior)">
                  {/* Resting pastel folded notes at the base */}
                  {[
                    { x: 50, y: 270, r: -12, w: 32, h: 20, color: "#E8B9D0" },
                    { x: 86, y: 275, r: 8, w: 30, h: 18, color: "#C9BCE8" },
                    { x: 122, y: 270, r: -4, w: 34, h: 22, color: "#F8E8D8" },
                    { x: 156, y: 274, r: 15, w: 28, h: 19, color: "#D4AF37" },
                    { x: 68, y: 254, r: 10, w: 32, h: 20, color: "#F4EAF5" },
                    { x: 104, y: 252, r: -8, w: 30, h: 19, color: "#E8B9D0" },
                    { x: 140, y: 255, r: 6, w: 32, h: 20, color: "#C9BCE8" },
                    { x: 80, y: 236, r: -6, w: 34, h: 21, color: "#F8E8D8" },
                    { x: 120, y: 235, r: 12, w: 32, h: 20, color: "#D4AF37" }
                  ].map((n, i) => (
                    <motion.rect
                      key={i}
                      x={n.x}
                      y={n.y}
                      width={n.w}
                      height={n.h}
                      rx="4"
                      fill={n.color}
                      opacity="0.88"
                      transform={`rotate(${n.r} ${n.x + n.w / 2} ${n.y + n.h / 2})`}
                      animate={{ y: [n.y, n.y - 2, n.y] }}
                      transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                    />
                  ))}

                  {/* TODAY'S CENTRAL GLOWING NOTE / SCROLL */}
                  <motion.g
                    animate={
                      noteOpen
                        ? { y: -80, scale: 1.15, opacity: 0 }
                        : { y: [0, -6, 0], scale: [1, 1.02, 1], opacity: 1 }
                    }
                    transition={{
                      duration: 3,
                      repeat: noteOpen ? 0 : Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Glowing golden halo around today's active note */}
                    <ellipse
                      cx="120"
                      cy="170"
                      rx="42"
                      ry="32"
                      fill="#D4AF37"
                      opacity="0.3"
                      filter="url(#softGlow)"
                    />
                    <rect
                      x="82"
                      y="142"
                      width="76"
                      height="56"
                      rx="8"
                      fill="url(#paperGlow)"
                      stroke="#D4AF37"
                      strokeWidth="2"
                      className="shadow-2xl"
                    />
                    {/* Fold crease & wax seal */}
                    <line x1="82" y1="170" x2="158" y2="170" stroke="#D4AF37" strokeOpacity="0.4" strokeDasharray="3 2" />
                    <circle cx="120" cy="170" r="10" fill="#E8B9D0" stroke="#D4AF37" strokeWidth="1.5" />
                    <polygon
                      points="120,166 123,172 129,172 124,175 126,181 120,177 114,181 116,175 111,172 117,172"
                      fill="#FFFFFF"
                    />
                  </motion.g>
                </g>

                {/* Outer Glass Body Contour */}
                <path
                  d="M48 76 Q34 88 34 115 L34 275 Q34 305 60 305 L180 305 Q206 305 206 275 L206 115 Q206 88 192 76 Z"
                  fill="url(#jarGlass)"
                  stroke="#C9BCE8"
                  strokeOpacity="0.5"
                  strokeWidth="2"
                />

                {/* Glass Light Highlights */}
                <path
                  d="M50 115 L50 265"
                  stroke="#FFFFFF"
                  strokeOpacity="0.45"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M60 120 L60 170"
                  stroke="#FFFFFF"
                  strokeOpacity="0.25"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M190 125 L190 260"
                  stroke="#FFFFFF"
                  strokeOpacity="0.2"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>

            {/* Action Button underneath jar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-4"
            >
              <Button
                size="lg"
                onClick={() => setNoteOpen(true)}
                className="bg-gradient-to-r from-blush via-gold to-lilac text-midnight font-medium shadow-glow hover:brightness-110"
              >
                <Sparkles className="h-4 w-4 mr-1 text-midnight" />
                Open Today&apos;s Note
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Today's Status, Details, Rotation Info & Calendar Sync */}
        <div className="space-y-6 lg:col-span-6 xl:col-span-5">
          {/* Main Reason Card */}
          <div className="glass relative overflow-hidden rounded-[28px] border border-lilac/25 p-7 shadow-2xl">
            <div className="flex items-center justify-between border-b border-lilac/15 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold">
                  <Sparkles className="h-3.5 w-3.5" />
                  Reason {paddedSeq} of {TOTAL_REASONS}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-lilac font-medium block">
                  Asia/Kolkata (IST)
                </span>
                <span className="text-sm font-semibold text-cloud">
                  {formatISTDisplayDate(istDateStr || new Date())}
                </span>
              </div>
            </div>

            {/* Revealed / Peek Content */}
            <div className="py-6">
              <h2 className="font-serif text-3xl font-medium tracking-tight text-cloud sm:text-4xl">
                365 Reasons Why I Love You
              </h2>
              <p className="mt-2 text-sm text-lilac">
                Every calendar day at midnight IST, our universe unfolds one more page of our love.
              </p>

              {/* Today's Snippet Preview */}
              <div
                onClick={() => setNoteOpen(true)}
                className="mt-6 cursor-pointer rounded-2xl bg-gradient-to-br from-cream/10 via-blush/10 to-lilac/10 p-5 border border-lilac/20 transition-all duration-300 hover:border-gold/50 hover:shadow-soft"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                    Today&apos;s Designated Reason
                  </span>
                  <span className="text-xs text-lilac flex items-center gap-1 font-medium">
                    Tap to unfold <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
                <p className="font-hand text-2xl leading-relaxed text-cream line-clamp-3">
                  &ldquo;{todayReason?.reason_text}&rdquo;
                </p>
              </div>
            </div>

            {/* Progress Bar & Countdown to next reason */}
            <div className="space-y-4 rounded-2xl bg-deep/40 p-5 border border-lilac/10">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs text-lilac mb-1.5 font-medium">
                  <span>Reveal Progress</span>
                  <span className="text-cloud font-semibold">
                    Day {sequence} of {TOTAL_REASONS} ({percentComplete}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-cloud/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentComplete}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blush via-gold to-lilac rounded-full"
                  />
                </div>
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-between pt-2 border-t border-lilac/10">
                <div className="flex items-center gap-2 text-xs text-lilac">
                  <Clock className="h-4 w-4 text-gold" />
                  <span>Next reason reveals in:</span>
                </div>
                <span className="num font-mono text-sm font-bold tracking-wider text-gold">
                  {countdownStr}
                </span>
              </div>
            </div>

            {/* Google Calendar Reminder Notice */}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-gold/10 p-4 border border-gold/25">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/20 text-gold">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-cloud">Google Calendar Reminder Active</p>
                  <p className="text-lilac/80">Every day at 11:55 PM IST (vrushabhcr7@gmail.com)</p>
                </div>
              </div>
              <a
                href="https://www.google.com/calendar/event?eid=azl2ODBrMXFlcHFhODJoN2NrNzUyYnYwZWNfMjAyNjExMDhUMTgyNTAwWiB2cnVzaGFiaGNyN0Bt"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-gold hover:underline flex items-center gap-1"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S UNFOLDED REASON MODAL */}
      <AnimatePresence>
        {noteOpen && todayReason && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNoteOpen(false)}
              className="absolute inset-0 bg-midnight/80 backdrop-blur-md"
            />

            {/* Emerging Unfolding Love Note */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 60, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 40 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="paper relative z-10 w-full max-w-lg overflow-hidden rounded-[26px] p-8 sm:p-10 shadow-2xl border-2 border-gold/30"
              style={{
                background: "linear-gradient(135deg, #FFFDF8 0%, #F8E8D8 100%)",
                boxShadow: "0 25px 60px -15px rgba(212, 175, 55, 0.35), 0 0 40px rgba(232, 185, 208, 0.4)"
              }}
            >
              {/* Close button */}
              <div className="absolute right-5 top-5">
                <button
                  onClick={() => setNoteOpen(false)}
                  className="rounded-full p-2 text-[#6b5a86] transition-colors hover:bg-black/5"
                  aria-label="Close reason"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Header inside Note */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8D78B5]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#6b5a86]">
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                  Reason {paddedSeq} of {TOTAL_REASONS}
                </span>
                <span className="text-xs font-semibold text-[#8D78B5]">
                  • {formatISTDisplayDate(istDateStr)}
                </span>
              </div>

              {/* Main Hand-written Love Reason */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="my-8"
              >
                <p className="font-hand text-3xl leading-relaxed text-[#2C223B] sm:text-4xl">
                  &ldquo;{todayReason.reason_text}&rdquo;
                </p>
              </motion.div>

              {/* Footnote / Signature */}
              <div className="flex items-center justify-between border-t border-[#6b5a86]/20 pt-4 text-xs text-[#6b5a86]">
                <span className="italic font-romance text-base">Always & Forever, Yours</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setNoteOpen(false)}
                  className="!border !border-[#6b5a86]/30 !text-[#2C223B] hover:!bg-[#6b5a86]/10"
                >
                  Fold note back into jar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOYFRIEND ADMIN DRAWER / MODAL */}
      {isAdmin && (
        <Modal
          open={adminOpen}
          onClose={() => setAdminOpen(false)}
          title="Boyfriend Admin Controls (Private)"
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Verification Status */}
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-cloud">
                    365 Reasons Loaded & Verified
                  </p>
                  <p className="text-xs text-lilac">
                    Source: <code className="text-gold">Our_Little_Universe_365_Reasons.xlsx</code>
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                365 / 365
              </span>
            </div>

            {/* Configurable Jar Start Date */}
            <div className="rounded-xl bg-deep/50 p-4 border border-lilac/15">
              <label className="block text-xs font-semibold uppercase tracking-wider text-lilac mb-1">
                Configurable Jar Start Date (YYYY-MM-DD)
              </label>
              <p className="text-xs text-lilac/70 mb-3">
                Current configured start date: <strong className="text-cloud">{settings?.start_date}</strong>.
                Changes how the daily sequence is deterministically calculated.
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="glass flex-1 rounded-xl px-3 py-2 text-sm text-cloud border border-lilac/20 focus:outline-none focus:border-gold"
                />
                <Button
                  onClick={handleSaveStartDate}
                  disabled={savingSettings || !newStartDate}
                  className="bg-gold text-midnight font-semibold hover:brightness-110"
                >
                  {savingSettings ? "Saving..." : "Save Date"}
                </Button>
              </div>
            </div>

            {/* Tomorrow Preview (Boyfriend Only) */}
            <div className="rounded-xl bg-lilac/10 p-4 border border-lilac/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gold" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gold">
                    Preview Tomorrow&apos;s Reason
                  </span>
                </div>
                <span className="text-[11px] text-lilac bg-midnight/40 px-2 py-0.5 rounded-full">
                  Reason #{Math.min(TOTAL_REASONS, sequence + 1).toString().padStart(3, "0")}
                </span>
              </div>
              <p className="font-hand text-xl text-cream leading-relaxed">
                &ldquo;{tomorrowReason?.reason_text}&rdquo;
              </p>
              <p className="mt-2 text-[11px] text-lilac italic">
                * Note: Revealed automatically to girlfriend at 12:00 AM IST.
              </p>
            </div>

            {/* Next 7 Days Forecast */}
            <div className="rounded-xl bg-deep/50 p-4 border border-lilac/15">
              <h4 className="text-xs font-bold uppercase tracking-wider text-lilac mb-3 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blush" /> Next 7 Days Scheduled Reasons
              </h4>
              <div className="space-y-2">
                {next7Days.map(({ offset, sequence: seq, reason }) => (
                  <div
                    key={seq}
                    className="flex items-start gap-2.5 rounded-lg bg-midnight/40 p-2.5 text-xs border border-lilac/10"
                  >
                    <span className="shrink-0 font-mono font-bold text-gold">
                      +# {offset} (Day {seq})
                    </span>
                    <span className="text-cloud/90">{reason?.reason_text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Search All 365 Reasons */}
            <div className="rounded-xl bg-deep/50 p-4 border border-lilac/15">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-lilac flex items-center gap-1.5">
                  <Search className="h-4 w-4 text-gold" /> Search All 365 Reasons
                </h4>
                <span className="text-xs text-lilac">{filteredReasons.length} found</span>
              </div>

              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search by keyword or day number (e.g. smile, #42)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass w-full rounded-xl pl-9 pr-3 py-2 text-xs text-cloud border border-lilac/20 focus:outline-none focus:border-gold"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-lilac" />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-lilac/10">
                {filteredReasons.slice(0, 50).map((r) => (
                  <div key={r.sequence_number} className="pt-2 text-xs">
                    <span className="font-mono font-semibold text-gold mr-2">
                      #{r.sequence_number.toString().padStart(3, "0")}
                    </span>
                    <span className="text-cloud/90">{r.reason_text}</span>
                  </div>
                ))}
                {filteredReasons.length > 50 && (
                  <p className="pt-2 text-center text-[11px] text-lilac">
                    Showing first 50 results. Refine search for more.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
