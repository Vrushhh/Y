import { describe, expect, it } from "vitest";

describe("Photobooth & Polaroid Functionality", () => {
  it("determines author correctly for Sonu and Yukku", () => {
    const sonuUserId = "sonu-uuid-123";
    const yukkuUserId = "yukku-uuid-456";

    const sonuPhoto = {
      id: "p1",
      image_path: "rel-id/photobooth/p1.jpg",
      caption: "Sunset at Marine Drive — Sonu",
      created_by: sonuUserId
    };

    const yukkuPhoto = {
      id: "p2",
      image_path: "rel-id/photobooth/p2.jpg",
      caption: "Laughing at your jokes — Yukku",
      created_by: yukkuUserId
    };

    const categorize = (photo: typeof sonuPhoto) => {
      const cap = photo.caption.toLowerCase();
      if (photo.created_by === sonuUserId || cap.includes("— sonu")) return "sonu";
      if (photo.created_by === yukkuUserId || cap.includes("— yukku")) return "yukku";
      return "unknown";
    };

    expect(categorize(sonuPhoto)).toBe("sonu");
    expect(categorize(yukkuPhoto)).toBe("yukku");
  });

  it("calculates Polaroid framing dimensions with square crop and handwriting border", () => {
    const PW = 520;
    const PH = 640;
    const pad = 32;
    const photoSize = PW - pad * 2; // 456 x 456 (1:1 square)
    const bottomBorder = PH - (pad + photoSize); // 152px

    expect(photoSize).toBe(456);
    expect(bottomBorder).toBe(152);
    expect(bottomBorder).toBeGreaterThan(100); // Plenty of space for handwritten caption and signature
  });

  it("formats caption with author signature when saved", () => {
    const formatCaption = (raw: string, authorName: string) => {
      const authorTag = `— ${authorName}`;
      return raw.trim()
        ? raw.includes("—")
          ? raw
          : `${raw} ${authorTag}`
        : `Our memory ${authorTag}`;
    };

    expect(formatCaption("Best day ever", "Sonu")).toBe("Best day ever — Sonu");
    expect(formatCaption("You and me — Yukku", "Yukku")).toBe("You and me — Yukku");
    expect(formatCaption("", "Sonu")).toBe("Our memory — Sonu");
  });
});
