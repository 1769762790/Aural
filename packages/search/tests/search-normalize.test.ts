import { buildSearchInitials, buildSearchQueryForms, compactSearchTerm, normalizeSearchTerm } from "../src/normalize";

describe("search normalization", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeSearchTerm("  Hello   WORLD  ")).toBe("hello world");
  });

  it("builds compact and initials variants", () => {
    expect(compactSearchTerm("Aural Player")).toBe("auralplayer");
    expect(buildSearchInitials("Aural Player")).toBe("ap");
    expect(buildSearchQueryForms("Aural Player")).toEqual({
      normalized: "aural player",
      compact: "auralplayer",
      initials: "ap",
      tokens: ["aural", "player"]
    });
  });
});

