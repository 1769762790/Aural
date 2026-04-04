import { cn } from "@/lib/utils";

export type OnlineArtistFilterValue = string | number;

export interface OnlineArtistFilterOption {
  label: string;
  value: OnlineArtistFilterValue;
}

interface OnlineArtistFiltersProps {
  area: number;
  type: number;
  initial: OnlineArtistFilterValue;
  areaOptions: OnlineArtistFilterOption[];
  typeOptions: OnlineArtistFilterOption[];
  initialOptions: OnlineArtistFilterOption[];
  onAreaChange: (value: number) => void;
  onTypeChange: (value: number) => void;
  onInitialChange: (value: OnlineArtistFilterValue) => void;
}

interface FilterRowProps {
  label: string;
  value: OnlineArtistFilterValue;
  options: OnlineArtistFilterOption[];
  compact?: boolean;
  onChange: (value: OnlineArtistFilterValue) => void;
}

const FilterButton = ({
  active,
  label,
  compact = false,
  onClick
}: {
  active: boolean;
  label: string;
  compact?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={active}
    className={cn(
      "rounded-full text-sm transition-all",
      compact ? "min-w-9 px-2.5 py-1.5 text-center" : "px-3 py-1.5",
      active
        ? "bg-primary/12 font-semibold text-primary shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_14%,transparent)]"
        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
    )}
    onClick={onClick}
  >
    {label}
  </button>
);

const FilterRow = ({ label, value, options, compact = false, onChange }: FilterRowProps) => (
  <div className="grid gap-3 md:grid-cols-[56px_minmax(0,1fr)] md:items-start">
    <span className="pt-1 text-sm text-muted-foreground">{label}</span>
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {options.map((option) => (
        <FilterButton
          key={`${label}-${String(option.value)}`}
          active={option.value === value}
          label={option.label}
          compact={compact}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  </div>
);

export const OnlineArtistFilters = ({
  area,
  type,
  initial,
  areaOptions,
  typeOptions,
  initialOptions,
  onAreaChange,
  onTypeChange,
  onInitialChange
}: OnlineArtistFiltersProps) => (
  <div className="rounded-[28px] border border-border bg-card/72 px-5 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Artist filters</span>
      </div>

      <div className="space-y-3">
        <FilterRow label="语种:" value={area} options={areaOptions} onChange={(value) => onAreaChange(Number(value))} />
        <FilterRow label="分类:" value={type} options={typeOptions} onChange={(value) => onTypeChange(Number(value))} />
        <FilterRow label="筛选:" value={initial} options={initialOptions} compact onChange={onInitialChange} />
      </div>
    </div>
  </div>
);
