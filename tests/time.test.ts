import { describe, expect, it } from "vitest";
import { addMonths, countdown, elapsed, nextAnniversary, ordinal, parseLocalDate } from "@/lib/time";

const start = parseLocalDate("2025-11-16");

describe("time", () => {
  it("parses dates as local midnight", () => {
    expect(start.getFullYear()).toBe(2025); expect(start.getMonth()).toBe(10); expect(start.getDate()).toBe(16); expect(start.getHours()).toBe(0);
  });
  it("counts the first year exactly", () => {
    const e = elapsed(start, parseLocalDate("2026-11-16"));
    expect(e.totalDays).toBe(365); expect(e.years).toBe(1); expect(e.months).toBe(0); expect(e.days).toBe(0);
  });
  it("breaks down partial periods", () => {
    const e = elapsed(start, new Date(2026, 10, 7, 13, 5, 9));
    expect(e.years).toBe(0); expect(e.months).toBe(11); expect(e.days).toBe(22);
    expect(e.hours).toBe(13); expect(e.minutes).toBe(5); expect(e.seconds).toBe(9);
  });
  it("never goes negative before the start", () => {
    const e = elapsed(start, parseLocalDate("2025-01-01"));
    expect(e.totalDays).toBe(0); expect(e.months).toBe(0);
  });
  it("clamps month-end dates", () => {
    expect(addMonths(parseLocalDate("2026-01-31"), 1).getDate()).toBe(28);
  });
  it("finds the next anniversary", () => {
    const a = nextAnniversary(start, parseLocalDate("2026-11-07"));
    expect(a.number).toBe(1); expect(a.isToday).toBe(false); expect(a.date.getDate()).toBe(16);
    expect(nextAnniversary(start, new Date(2026, 10, 16, 18)).isToday).toBe(true);
    expect(nextAnniversary(start, parseLocalDate("2026-11-17")).number).toBe(2);
  });
  it("counts down", () => {
    const c = countdown(parseLocalDate("2026-11-16"), parseLocalDate("2026-11-07"));
    expect(c.days).toBe(9); expect(c.done).toBe(false);
    expect(countdown(parseLocalDate("2020-01-01")).done).toBe(true);
  });
  it("formats ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
});
