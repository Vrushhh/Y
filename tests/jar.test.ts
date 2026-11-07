import { describe, expect, it } from "vitest";
import {
  diffCalendarDays,
  getCountdownToNextMidnightIST,
  getISTDateString,
  getLocalFallbackReasons,
  getSequenceNumberForDate,
  isBoyfriendAdmin,
  TOTAL_REASONS
} from "../lib/jar";

describe("Jar of 365 Reasons", () => {
  it("contains exactly 365 reasons with sequential numbering and non-empty text", () => {
    const reasons = getLocalFallbackReasons();
    expect(reasons).toHaveLength(365);
    expect(TOTAL_REASONS).toBe(365);

    reasons.forEach((r, idx) => {
      expect(r.sequence_number).toBe(idx + 1);
      expect(r.reason_text).toBeTruthy();
      expect(typeof r.reason_text).toBe("string");
      expect(r.reason_text.length).toBeGreaterThan(5);
    });

    // Check specific known reason samples from prompt
    expect(reasons[0].reason_text).toBe("I love how your smile can make an ordinary day feel special.");
    expect(reasons[364].reason_text).toBe("I love that every new day gives us another page to write.");
  });

  it("calculates Reason 1 on configured start date", () => {
    const startDate = "2026-11-08";
    const res = getSequenceNumberForDate("2026-11-08", startDate);
    expect(res.sequence).toBe(1);
    expect(res.dayIndex).toBe(0);
    expect(res.isBeforeStart).toBe(false);
  });

  it("handles dates before start date gracefully", () => {
    const startDate = "2026-11-08";
    const res = getSequenceNumberForDate("2026-11-05", startDate);
    expect(res.sequence).toBe(1);
    expect(res.isBeforeStart).toBe(true);
    expect(res.dayIndex).toBe(-3);
  });

  it("advances reason day-by-day across months and leap years", () => {
    const startDate = "2024-02-27"; // Leap year 2024 has 29 Feb
    expect(diffCalendarDays(startDate, "2024-02-28")).toBe(1);
    expect(diffCalendarDays(startDate, "2024-02-29")).toBe(2);
    expect(diffCalendarDays(startDate, "2024-03-01")).toBe(3);

    const resLeap = getSequenceNumberForDate("2024-03-01", startDate);
    expect(resLeap.sequence).toBe(4);
  });

  it("advances at midnight IST deterministically", () => {
    // 11:59:59 PM IST vs 12:00:01 AM IST
    const preMidnight = new Date("2026-11-08T18:29:59.000Z"); // 18:29:59 UTC = 23:59:59 IST (+5:30)
    const postMidnight = new Date("2026-11-08T18:30:01.000Z"); // 18:30:01 UTC = 00:00:01 IST next day (Nov 9)

    const dateBefore = getISTDateString(preMidnight);
    const dateAfter = getISTDateString(postMidnight);

    expect(dateBefore).toBe("2026-11-08");
    expect(dateAfter).toBe("2026-11-09");

    const seqBefore = getSequenceNumberForDate(dateBefore, "2026-11-08").sequence;
    const seqAfter = getSequenceNumberForDate(dateAfter, "2026-11-08").sequence;

    expect(seqBefore).toBe(1);
    expect(seqAfter).toBe(2);
  });

  it("handles Day 365 and caps at completion without wrap-around reset", () => {
    const startDate = "2025-11-16";
    // 364 days later is Day 365
    // 2025-11-16 + 364 days = 2026-11-15
    const day365 = getSequenceNumberForDate("2026-11-15", startDate);
    expect(day365.sequence).toBe(365);
    expect(day365.isCompleted).toBe(true);

    // Days past 365 remain capped at 365 and completed
    const day366 = getSequenceNumberForDate("2026-11-16", startDate);
    expect(day366.sequence).toBe(365);
    expect(day366.isCompleted).toBe(true);
  });

  it("calculates countdown to next midnight IST correctly", () => {
    // 23:55:00 IST (18:25:00 UTC) -> 5 minutes left
    const testDate = new Date("2026-11-08T18:25:00.000Z");
    const countdown = getCountdownToNextMidnightIST(testDate);
    expect(countdown.hours).toBe(0);
    expect(countdown.minutes).toBe(5);
    expect(countdown.seconds).toBe(0);
    expect(countdown.formatted).toBe("00:05:00");
  });

  it("enforces boyfriend-only admin authorization", () => {
    expect(isBoyfriendAdmin("vrushabhcr7@gmail.com", "member")).toBe(true);
    expect(isBoyfriendAdmin("VRUSHABHCR7@GMAIL.COM", "member")).toBe(true);
    expect(isBoyfriendAdmin("yukku@example.com", "owner")).toBe(true); // owner role
    expect(isBoyfriendAdmin("yukku@example.com", "member")).toBe(false);
    expect(isBoyfriendAdmin(null, "member")).toBe(false);
    expect(isBoyfriendAdmin(null, null)).toBe(false);
  });
});
