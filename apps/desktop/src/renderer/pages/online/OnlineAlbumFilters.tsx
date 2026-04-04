import { cn } from "@/lib/utils";

export type OnlineAlbumArea = "ALL" | "ZH" | "EA" | "KR" | "JP";

export interface OnlineAlbumFilterOption {
  label: string;
  value: OnlineAlbumArea;
}

interface OnlineAlbumFiltersProps {
  value: OnlineAlbumArea;
  options: OnlineAlbumFilterOption[];
  onChange: (value: OnlineAlbumArea) => void;
}

export const OnlineAlbumFilters = ({
  value,
  options,
  onChange
}: OnlineAlbumFiltersProps) => (
  <div className="flex flex-wrap items-center gap-3">
    {options.map((option) => {
      const active = option.value === value;

      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={active}
          className={cn(
            "rounded-full border px-5 py-2 text-sm transition-all",
            active
              ? "border-primary/40 bg-primary/14 font-semibold text-primary shadow-[0_14px_30px_color-mix(in_srgb,var(--primary)_20%,transparent)]"
              : "border-border/80 bg-card/70 text-muted-foreground hover:border-primary/20 hover:bg-accent/40 hover:text-foreground"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
