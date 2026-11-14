"use client";

import { useEffect, useState } from "react";

export const ISSUED = new Date("2026-11-14T00:00:00+05:30");
export const DEPARTURE = new Date("2026-11-16T00:00:00+05:30");

export function useBoardingClock(simulatedStart?: number) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let active = true;
    let anchor: { time: number; tick: number } | undefined;
    const tick = () => {
      if (anchor) setNow(new Date(anchor.time + performance.now() - anchor.tick));
    };
    const sync = async () => {
      if (simulatedStart !== undefined) {
        anchor = { time: simulatedStart, tick: performance.now() };
      } else {
        try {
          const response = await fetch("/api/boarding-clock", { cache: "no-store" });
          if (!response.ok) return;
          const data = await response.json();
          if (!active || !Number.isFinite(data.now)) return;
          anchor = { time: data.now, tick: performance.now() };
        } catch { return; }
      }
      tick();
    };
    void sync();
    const timer = window.setInterval(tick, 500);
    const refresh = simulatedStart === undefined ? window.setInterval(sync, 15_000) : undefined;
    return () => {
      active = false;
      window.clearInterval(timer);
      window.clearInterval(refresh);
    };
  }, [simulatedStart]);
  return now;
}
