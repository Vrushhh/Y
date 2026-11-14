import { describe, expect, it } from "vitest";
import { safeReturnPath } from "../lib/return-path";

describe("sign-in return path", () => {
  it("preserves the ticket and QR countdown destinations", () => {
    expect(safeReturnPath("/boardingpass")).toBe("/boardingpass");
    expect(safeReturnPath("/?from=boarding-pass")).toBe("/?from=boarding-pass");
  });

  it.each(["https://example.com", "//example.com", "/\\example.com", "/path/..//example.com", "/login", "/auth/callback"])(
    "falls back for %s",
    (path) => expect(safeReturnPath(path)).toBe("/universe")
  );
});
