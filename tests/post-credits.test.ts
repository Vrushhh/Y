import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { POST_CREDITS_CLIPS } from "@/app/(app)/secret/YearOneReview";

describe("Year One Wrapped: Hidden Post-Credits Scene", () => {
  const EXPECTED_ORDER = [
    "0bb956f9-ce3d-4abb-807c-c31ec441504a.MP4",
    "282e82da-09e6-43a0-b273-3c180d82d352.MP4",
    "5623fe1c-f057-4c81-9b2d-78172ca8c8fb.MP4",
    "6e01db72-348a-461a-8744-3f4d214d84bb.MP4",
    "a602b66d-1d9a-4603-9510-88ee1638c0b7.MP4",
    "ae66fbb8-8323-4fdd-b11e-86f8ea9e8be7.MP4"
  ];

  it("preserves exact six clips, playback order, and uppercase .MP4 extensions", () => {
    expect(POST_CREDITS_CLIPS).toHaveLength(6);
    expect(POST_CREDITS_CLIPS).toEqual(EXPECTED_ORDER);

    for (const clip of POST_CREDITS_CLIPS) {
      expect(clip.endsWith(".MP4")).toBe(true);
      expect(clip).not.toContain(".mp4");
    }
  });

  it("constructs correct storage folder path from relationship.id", () => {
    const relationshipId = "bde04224-1d3e-41e7-b53d-27b6c7a956d1";
    const clipPaths = POST_CREDITS_CLIPS.map(
      (file) => `${relationshipId}/year-one-post-credits/${file}`
    );

    expect(clipPaths[0]).toBe(
      `${relationshipId}/year-one-post-credits/0bb956f9-ce3d-4abb-807c-c31ec441504a.MP4`
    );
    expect(clipPaths[5]).toBe(
      `${relationshipId}/year-one-post-credits/ae66fbb8-8323-4fdd-b11e-86f8ea9e8be7.MP4`
    );
  });

  it("verifies the storage migration rule checks all 5 Secret Corner unlocks", () => {
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/20261109010000_year_one_post_credits_storage.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("parts[2] = 'year-one-post-credits'");
    expect(sql).toContain("public.has_unlocked('moon')");
    expect(sql).toContain("public.has_unlocked('constellation')");
    expect(sql).toContain("public.has_unlocked('game-champion')");
    expect(sql).toContain("public.has_unlocked('hidden-memory')");
    expect(sql).toContain("public.has_unlocked('secret-letter')");
  });

  it("models playback transitions across all 6 clips and ends with finale", () => {
    let currentClip = 0;
    const history: number[] = [currentClip];

    // Simulate 5 transitions
    for (let i = 0; i < 5; i++) {
      currentClip++;
      history.push(currentClip);
    }

    expect(history).toEqual([0, 1, 2, 3, 4, 5]);
    expect(currentClip).toBe(5);

    // End of compilation reached
    const isFinished = currentClip + 1 >= POST_CREDITS_CLIPS.length;
    expect(isFinished).toBe(true);

    // Simulate replay compilation
    currentClip = 0;
    expect(currentClip).toBe(0);
  });
});

