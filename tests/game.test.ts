import { describe, expect, it } from "vitest";
import { GAMES, norm, scoreRound, similarity, usesPrediction } from "@/lib/game";

describe("game scoring (mirrors SQL)", () => {
  it("has nine game modes", () => expect(GAMES).toHaveLength(9));
  it("normalises answers", () => expect(norm("  Mountains   by  the Sea ")).toBe("mountains by the sea"));
  it("scores predictions against the partner's real answer", () => {
    const r = scoreRound("who_knows", { answer: "Cat", prediction: "Dog" }, { answer: "Dog", prediction: "Fish" }, 10);
    expect(r).toEqual({ a: 10, b: 0, matched: false });
    expect(scoreRound("guess_my_answer", { answer: "Blue", prediction: "red " }, { answer: "Red", prediction: "blue" }, 10).matched).toBe(true);
  });
  it("scores trivia against the correct answer", () => {
    expect(scoreRound("relationship_trivia", { answer: "November" }, { answer: "December" }, 10, "November")).toEqual({ a: 10, b: 0, matched: false });
  });
  it("scores trivia without a correct answer by matching", () => {
    expect(scoreRound("memory_challenge", { answer: "Winter" }, { answer: "winter" }, 10, null)).toEqual({ a: 10, b: 10, matched: true });
  });
  it("rewards matching preferences", () => {
    expect(scoreRound("this_or_that", { answer: "Tea" }, { answer: "Coffee" }, 5)).toEqual({ a: 0, b: 0, matched: false });
    expect(scoreRound("compatibility", { answer: "Hills" }, { answer: "Hills" }, 10)).toEqual({ a: 10, b: 10, matched: true });
  });
  it("computes similarity", () => { expect(similarity(3, 4)).toBe(75); expect(similarity(0, 0)).toBe(0); });
  it("knows which games need predictions", () => { expect(usesPrediction("who_knows")).toBe(true); expect(usesPrediction("this_or_that")).toBe(false); });
});
