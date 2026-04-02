import { Fragment, type ReactNode } from "react";

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const renderHighlightedText = (text: string, keyword: string): ReactNode => {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    return text;
  }

  const matcher = new RegExp(`(${escapeRegExp(normalizedKeyword)})`, "ig");
  const segments = text.split(matcher);

  return segments.map((segment, index) => {
    const isMatch = segment.toLowerCase() === normalizedKeyword.toLowerCase();

    return (
      <Fragment key={`${segment}-${index}`}>
        {isMatch ? (
          <mark className="rounded-md bg-primary/18 px-0.5 text-foreground shadow-[inset_0_-0.55em_0_color-mix(in_srgb,var(--primary)_42%,transparent)]">
            {segment}
          </mark>
        ) : (
          segment
        )}
      </Fragment>
    );
  });
};
