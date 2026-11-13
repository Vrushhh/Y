export type GameType =
  | "who_knows" | "guess_my_answer" | "this_or_that" | "relationship_trivia"
  | "would_you_rather" | "finish_sentence" | "memory_challenge" | "compatibility" | "every_lifetime";

export const GAMES: { type: GameType; name: string; blurb: string; predicts: boolean }[] = [
  { type: "every_lifetime", name: "Find Me in Every Lifetime", blurb: "Follow each other’s clues through the past, present, and future, then reunite. Four story rounds.", predicts: false },
  { type: "who_knows", name: "Who knows whom better?", blurb: "Answer for yourself, then guess what your person picked.", predicts: true },
  { type: "guess_my_answer", name: "Guess my answer", blurb: "Type your answer and your prediction of theirs. Both appear at once.", predicts: true },
  { type: "this_or_that", name: "This or that", blurb: "Quick picks. See where you match.", predicts: false },
  { type: "relationship_trivia", name: "Relationship trivia", blurb: "Questions about your own story.", predicts: false },
  { type: "would_you_rather", name: "Would you rather?", blurb: "Two scenarios, two choices, one reveal.", predicts: false },
  { type: "finish_sentence", name: "Finish my sentence", blurb: "Complete the same sentence and compare.", predicts: false },
  { type: "memory_challenge", name: "Memory challenge", blurb: "Photos and moments. Name the place, the day, the occasion.", predicts: false },
  { type: "compatibility", name: "Compatibility quiz", blurb: "Preferences side by side, with a similarity score.", predicts: false }
];

export const gameName = (t: string) => GAMES.find((g) => g.type === t)?.name ?? t;
export const usesPrediction = (t: string) => GAMES.find((g) => g.type === t)?.predicts ?? false;

export const norm = (s?: string | null) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Mirrors public.submit_game_answer scoring in SQL. The database is the source of truth;
 * this copy is used for previews and unit tests.
 */
export function scoreRound(
  type: GameType,
  a: { answer: string; prediction?: string | null },
  b: { answer: string; prediction?: string | null },
  points: number,
  correct?: string | null
): { a: number; b: number; matched: boolean } {
  if (type === "who_knows" || type === "guess_my_answer") {
    const aHit = norm(a.prediction) === norm(b.answer);
    const bHit = norm(b.prediction) === norm(a.answer);
    return { a: aHit ? points : 0, b: bHit ? points : 0, matched: aHit && bHit };
  }
  const matched = norm(a.answer) === norm(b.answer);
  if ((type === "relationship_trivia" || type === "memory_challenge") && correct) {
    return { a: norm(a.answer) === norm(correct) ? points : 0, b: norm(b.answer) === norm(correct) ? points : 0, matched };
  }
  return { a: matched ? points : 0, b: matched ? points : 0, matched };
}

export function similarity(matchedRounds: number, totalRounds: number) {
  return totalRounds === 0 ? 0 : Math.round((matchedRounds / totalRounds) * 100);
}
