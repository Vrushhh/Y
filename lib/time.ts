const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Parses "YYYY-MM-DD" as local midnight (not UTC). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addMonths(date: Date, months: number): Date {
  const r = new Date(date);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + months);
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDay));
  return r;
}

export type Elapsed = {
  totalDays: number; years: number; months: number; days: number;
  hours: number; minutes: number; seconds: number;
};

export function elapsed(from: Date, now: Date = new Date()): Elapsed {
  const ms = Math.max(0, now.getTime() - from.getTime());
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (months > 0 && addMonths(from, months) > now) months -= 1;
  months = Math.max(0, months);
  const rest = Math.max(0, now.getTime() - addMonths(from, months).getTime());
  return {
    totalDays: Math.floor(ms / DAY),
    years: Math.floor(months / 12),
    months: months % 12,
    days: Math.floor(rest / DAY),
    hours: Math.floor((rest % DAY) / HOUR),
    minutes: Math.floor((rest % HOUR) / MINUTE),
    seconds: Math.floor((rest % MINUTE) / SECOND)
  };
}

/** Next anniversary on or after today (today counts as the anniversary). */
export function nextAnniversary(start: Date, now: Date = new Date()): { date: Date; number: number; isToday: boolean } {
  let years = now.getFullYear() - start.getFullYear();
  if (years < 1) years = 1;
  let date = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date < today) { years += 1; date = new Date(start.getFullYear() + years, start.getMonth(), start.getDate()); }
  return { date, number: years, isToday: date.getTime() === today.getTime() };
}

export function countdown(to: Date, now: Date = new Date()) {
  const ms = Math.max(0, to.getTime() - now.getTime());
  return {
    done: ms === 0,
    days: Math.floor(ms / DAY),
    hours: Math.floor((ms % DAY) / HOUR),
    minutes: Math.floor((ms % HOUR) / MINUTE),
    seconds: Math.floor((ms % MINUTE) / SECOND)
  };
}

export function formatDate(value?: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!value) return "";
  const d = value.length <= 10 ? parseLocalDate(value) : new Date(value);
  return d.toLocaleDateString("en-IN", opts);
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
