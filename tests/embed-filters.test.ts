import { describe, expect, it } from "vitest";
import { toEmbedUrl } from "@/lib/embed";
import { applyFilter } from "@/lib/filters";

describe("music embeds", () => {
  it("converts Spotify and YouTube links", () => {
    expect(toEmbedUrl("https://open.spotify.com/track/abc123?si=x")).toBe("https://open.spotify.com/embed/track/abc123");
    expect(toEmbedUrl("https://open.spotify.com/intl-de/album/XYZ")).toBe("https://open.spotify.com/embed/album/XYZ");
    expect(toEmbedUrl("https://www.youtube.com/watch?v=dQw")).toBe("https://www.youtube-nocookie.com/embed/dQw");
    expect(toEmbedUrl("https://youtu.be/dQw")).toBe("https://www.youtube-nocookie.com/embed/dQw");
  });
  it("ignores other links", () => {
    expect(toEmbedUrl("https://music.apple.com/x")).toBeNull();
    expect(toEmbedUrl("not a url")).toBeNull();
    expect(toEmbedUrl(null)).toBeNull();
  });
});

describe("photobooth filters", () => {
  it("makes black and white pixels grey", () => {
    const px = new Uint8ClampedArray([200, 50, 10, 255]);
    applyFilter(px, "mono");
    expect(px[0]).toBe(px[1]); expect(px[1]).toBe(px[2]); expect(px[3]).toBe(255);
  });
  it("leaves natural untouched", () => {
    const px = new Uint8ClampedArray([1, 2, 3, 4]);
    applyFilter(px, "none");
    expect(Array.from(px)).toEqual([1, 2, 3, 4]);
  });
});
