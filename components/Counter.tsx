"use client";
import { useEffect, useState } from "react";
import { elapsed } from "@/lib/time";

const pad = (n: number) => String(n).padStart(2, "0");

/** Live "time together" counter. Rendered after mount to avoid hydration mismatch. */
export function Counter({ start, compact }: { start: Date; compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="h-16" aria-hidden />;
  const e = elapsed(start, now);
  const parts = [
    e.years ? `${e.years} year${e.years > 1 ? "s" : ""}` : null,
    e.months ? `${e.months} month${e.months > 1 ? "s" : ""}` : null,
    `${e.days} day${e.days === 1 ? "" : "s"}`
  ].filter(Boolean).join(", ");
  if (compact) {
    return <span className="tabular-nums">{e.totalDays.toLocaleString("en-IN")} days together</span>;
  }
  return (
    <div className="text-center" aria-live="off">
      <div className="num font-display text-6xl text-cream sm:text-7xl">{e.totalDays.toLocaleString("en-IN")}</div>
      <div className="mt-1 text-sm text-lilac">days together</div>
      <div className="mt-3 text-sm text-lilac/80">
        {parts} <span className="tabular-nums text-cloud/80">· {pad(e.hours)}:{pad(e.minutes)}:{pad(e.seconds)}</span>
      </div>
    </div>
  );
}
