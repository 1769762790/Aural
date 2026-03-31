import { useEffect, useState } from "react";
import { extractCoverTheme, getFallbackCoverTheme } from "@renderer/lib/coverTheme";

type CoverTheme = ReturnType<typeof getFallbackCoverTheme>;

export const usePlayerCoverTheme = (
  coverUrl: string | null,
  enabled: boolean,
  theme: "light" | "dark"
) => {
  const [coverTheme, setCoverTheme] = useState<CoverTheme>(() => getFallbackCoverTheme(theme));

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !coverUrl) {
      setCoverTheme(getFallbackCoverTheme(theme));
      return;
    }

    void extractCoverTheme(coverUrl, theme).then((nextTheme) => {
      if (!cancelled) {
        setCoverTheme(nextTheme);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [coverUrl, enabled, theme]);

  return coverTheme;
};
