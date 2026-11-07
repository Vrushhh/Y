/**
 * Jar of 365 Reasons - Core Library
 * Timezone: Asia/Kolkata (IST, UTC+5:30)
 * Authoritative rotation, date math, database queries, and fallback support.
 */

import reasonsData from "@/data/Our_Little_Universe_365_Reasons.json";
import { getSupabase } from "@/lib/supabase/client";

export const TIMEZONE = "Asia/Kolkata";
export const TOTAL_REASONS = 365;
export const DEFAULT_JAR_START_DATE = "2025-11-16"; // Configurable start date

export interface JarReason {
  id: string;
  sequence_number: number;
  reason_text: string;
  created_at?: string;
}

export interface JarSettings {
  id?: string;
  start_date: string; // "YYYY-MM-DD"
  timezone: string;
  is_active: boolean;
  updated_at?: string;
}

export interface DailyRevealHistory {
  id: string;
  display_date: string; // "YYYY-MM-DD"
  reason_id: string;
  sequence_number?: number;
  reason_text?: string;
  created_at?: string;
}

/**
 * Returns formatted "YYYY-MM-DD" for a Date in Asia/Kolkata timezone.
 */
export function getISTDateString(d: Date = new Date()): string {
  // Format to YYYY-MM-DD in Asia/Kolkata timezone using Intl
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(d);
}

/**
 * Calculates calendar day difference between two "YYYY-MM-DD" dates (b - a).
 */
export function diffCalendarDays(startDateStr: string, targetDateStr: string): number {
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ty, tm, td] = targetDateStr.split("-").map(Number);
  const startUTC = Date.UTC(sy, sm - 1, sd);
  const targetUTC = Date.UTC(ty, tm - 1, td);
  return Math.round((targetUTC - startUTC) / (1000 * 60 * 60 * 24));
}

/**
 * Deterministic calculation of current sequence number (1 to 365).
 * - Day 1 on start date.
 * - Caps at 365 without premature wrapping or resetting.
 */
export function getSequenceNumberForDate(
  targetDateStr: string,
  startDateStr: string = DEFAULT_JAR_START_DATE
): {
  sequence: number;
  dayIndex: number; // 0-based offset
  isBeforeStart: boolean;
  isCompleted: boolean;
} {
  const diff = diffCalendarDays(startDateStr, targetDateStr);
  if (diff < 0) {
    return {
      sequence: 1,
      dayIndex: diff,
      isBeforeStart: true,
      isCompleted: false
    };
  }
  const sequence = Math.min(TOTAL_REASONS, diff + 1);
  return {
    sequence,
    dayIndex: diff,
    isBeforeStart: false,
    isCompleted: diff + 1 >= TOTAL_REASONS
  };
}

/**
 * Milliseconds and formatted countdown string until next midnight in Asia/Kolkata.
 */
export function getCountdownToNextMidnightIST(now: Date = new Date()): {
  msUntilMidnight: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  // Find current time components in Asia/Kolkata
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  }).formatToParts(now);

  let h = 0, m = 0, s = 0;
  for (const part of parts) {
    if (part.type === "hour") h = parseInt(part.value, 10);
    if (part.type === "minute") m = parseInt(part.value, 10);
    if (part.type === "second") s = parseInt(part.value, 10);
  }

  const secondsPassedToday = h * 3600 + m * 60 + s;
  const secondsLeft = Math.max(0, 86400 - secondsPassedToday);
  const msUntilMidnight = secondsLeft * 1000;

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { msUntilMidnight, hours, minutes, seconds, formatted };
}

/**
 * Formats a Date or "YYYY-MM-DD" for display in IST (e.g., "Sunday, 8 November 2026").
 */
export function formatISTDisplayDate(dateStrOrDate: string | Date = new Date()): string {
  let d: Date;
  if (typeof dateStrOrDate === "string") {
    const [y, m, day] = dateStrOrDate.split("-").map(Number);
    d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  } else {
    d = dateStrOrDate;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(d);
}

/**
 * In-memory / Fallback all 365 reasons from JSON.
 */
export function getLocalFallbackReasons(): JarReason[] {
  return reasonsData.map((item) => ({
    id: `local-reason-${item.day}`,
    sequence_number: item.day,
    reason_text: item.reason
  }));
}

/**
 * Fetch Jar Settings from Supabase or localStorage fallback.
 */
export async function fetchJarSettings(): Promise<JarSettings> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("jar_settings")
        .select("id, start_date, timezone, is_active, updated_at")
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          start_date: data.start_date || DEFAULT_JAR_START_DATE,
          timezone: data.timezone || TIMEZONE,
          is_active: data.is_active ?? true,
          updated_at: data.updated_at
        };
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to localStorage if in browser
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("olu_jar_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          start_date: parsed.start_date || DEFAULT_JAR_START_DATE,
          timezone: TIMEZONE,
          is_active: true
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    start_date: DEFAULT_JAR_START_DATE,
    timezone: TIMEZONE,
    is_active: true
  };
}

/**
 * Update Jar Start Date (Boyfriend Admin only).
 */
export async function updateJarStartDate(newStartDate: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data: existing } = await sb.from("jar_settings").select("id").limit(1).maybeSingle();
      if (existing) {
        const { error } = await sb
          .from("jar_settings")
          .update({ start_date: newStartDate, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (!error) return true;
      } else {
        const { error } = await sb.from("jar_settings").insert({
          start_date: newStartDate,
          timezone: TIMEZONE,
          is_active: true
        });
        if (!error) return true;
      }
    } catch {
      // fallback
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(
      "olu_jar_settings",
      JSON.stringify({ start_date: newStartDate, timezone: TIMEZONE })
    );
    return true;
  }
  return false;
}

/**
 * Fetch all 365 reasons (from Supabase or local fallback).
 */
export async function fetchAllReasons(): Promise<JarReason[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("jar_reasons")
        .select("id, sequence_number, reason_text, created_at")
        .order("sequence_number", { ascending: true });
      if (!error && data && data.length === TOTAL_REASONS) {
        return data;
      }
    } catch {
      // fallback
    }
  }
  return getLocalFallbackReasons();
}

/**
 * Gets the reason for a specific sequence number.
 */
export async function getReasonBySequence(sequence: number): Promise<JarReason> {
  const all = await fetchAllReasons();
  const found = all.find((r) => r.sequence_number === sequence);
  return found || all[0];
}

/**
 * Authoritative Today Reason resolution based on current IST date.
 */
export async function getAuthoritativeTodayReason(
  now: Date = new Date(),
  customStartDate?: string
): Promise<{
  reason: JarReason;
  sequence: number;
  istDate: string;
  isBeforeStart: boolean;
  isCompleted: boolean;
  totalReasons: number;
}> {
  const settings = customStartDate ? { start_date: customStartDate } : await fetchJarSettings();
  const istDate = getISTDateString(now);
  const { sequence, isBeforeStart, isCompleted } = getSequenceNumberForDate(
    istDate,
    settings.start_date
  );

  const reason = await getReasonBySequence(sequence);

  // Record daily history if Supabase is connected
  const sb = getSupabase();
  if (sb && reason?.id) {
    try {
      await sb
        .from("jar_daily_history")
        .insert({
          display_date: istDate,
          reason_id: reason.id
        })
        .select();
    } catch {
      // unique constraint violation is expected on subsequent visits
    }
  }

  return {
    reason,
    sequence,
    istDate,
    isBeforeStart,
    isCompleted,
    totalReasons: TOTAL_REASONS
  };
}

/**
 * Check if the user is the boyfriend (admin).
 */
export function isBoyfriendAdmin(userEmail?: string | null, userRole?: string | null): boolean {
  if (!userEmail && !userRole) return false;
  const cleanEmail = (userEmail || "").trim().toLowerCase();
  return cleanEmail === "vrushabhcr7@gmail.com" || userRole === "owner";
}
