import { scoreCandidate } from "../src/ranking";

describe("search ranking", () => {
  it("prefers exact and pinyin matches over fuzzy matches", () => {
    const exact = scoreCandidate({ texts: ["Moonlight"], pinyin: "moonlight", pinyinInitials: "ml" }, "moonlight");
    const pinyin = scoreCandidate({ texts: ["你好"], pinyin: "ni hao", pinyinInitials: "nh" }, "nihao");
    const initials = scoreCandidate({ texts: ["你好"], pinyin: "ni hao", pinyinInitials: "nh" }, "nh");
    const fuzzy = scoreCandidate({ texts: ["Aural Music Library"], pinyin: null, pinyinInitials: null }, "aur lib");

    expect(exact?.reason).toBe("exact");
    expect(pinyin?.reason).toBe("pinyin");
    expect(initials?.reason).toBe("initials");
    expect(fuzzy?.reason).toBe("fuzzy");
  });
});

