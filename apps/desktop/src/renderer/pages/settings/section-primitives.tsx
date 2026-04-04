import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Intro = ({
  icon: Icon,
  eyebrow,
  description
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  description: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-[18px] border border-primary/16 bg-primary/12 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-[16px] font-semibold uppercase tracking-[0.32em] text-primary">{eyebrow}</p>
      </div>
    </div>
    <p className="max-w-full text-sm leading-7 text-muted-foreground">{description}</p>
  </div>
);

export const SettingsCard = ({
  title,
  description,
  children,
  action
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) => (
  <div className="rounded-[30px] border border-border bg-background/58 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:bg-background/45 dark:shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <TooltipProvider delayDuration={180}>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="w-fit cursor-help text-xl font-bold tracking-[-0.04em] text-foreground">{title}</h3>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-sm rounded-[14px] border border-border bg-popover px-3 py-2 text-sm leading-6 text-popover-foreground shadow-[0_16px_36px_rgba(0,0,0,0.14)]"
            >
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {action}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

export const ToggleRow = ({
  label,
  desc,
  checked,
  onChange,
  live = false,
  disabled = false
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  live?: boolean;
  disabled?: boolean;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-border bg-background/55 px-5 py-4">
    <div className="max-w-2xl space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {live ? <Badge variant="secondary">Live</Badge> : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
    </div>
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={(value) => onChange(Boolean(value))}
      className="data-checked:bg-primary data-unchecked:bg-input/90"
    />
  </div>
);

export const SegmentRow = ({
  label,
  desc,
  value,
  options,
  onChange,
  live = false,
  disabled = false
}: {
  label: string;
  desc: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  live?: boolean;
  disabled?: boolean;
}) => (
  <div className="rounded-[24px] border border-border bg-background/55 p-5">
    <div className="mb-4 space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {live ? <Badge variant="secondary">Live</Badge> : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
    </div>
    <div className={cn("grid gap-2 rounded-[20px] bg-background/85 p-2", options.length > 3 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3")}>
      {options.map(([text, optionValue]) => (
        <button
          key={optionValue}
          type="button"
          disabled={disabled}
          className={cn(
            "rounded-[16px] px-4 py-3 text-sm font-semibold transition-all",
            value === optionValue
              ? "bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(120,89,255,0.2)]"
              : "bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            disabled && "cursor-not-allowed opacity-60"
          )}
          onClick={() => onChange(optionValue)}
        >
          {text}
        </button>
      ))}
    </div>
  </div>
);

export const RangeRow = ({
  label,
  desc,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  onCommit,
  live = false
}: {
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
  onCommit?: () => void;
  live?: boolean;
}) => (
  <div className="rounded-[24px] border border-border bg-background/55 p-5">
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {live ? <Badge variant="secondary">Live</Badge> : null}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
      </div>
      <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/72">
        {Number.isInteger(value) ? value : value.toFixed(1)}
        {suffix}
      </span>
    </div>
    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(values) => {
        const next = values[0];
        if (typeof next === "number" && Number.isFinite(next)) {
          onChange(next);
        }
      }}
      onValueCommit={onCommit}
      className="w-full"
    />
  </div>
);

export const SelectRow = ({
  label,
  desc,
  value,
  options,
  onChange,
  disabled = false
}: {
  label: string;
  desc: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const activeLabel = options.find((option) => option.value === value)?.label ?? "";

  return (
    <div className="rounded-[24px] border border-border bg-background/55 p-5">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
      </div>
      <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)} disabled={disabled}>
        <SelectTrigger className="h-12 w-full rounded-[18px] border-border bg-background px-4 text-sm text-foreground shadow-none hover:bg-background/95">
          <SelectValue placeholder="Select">{activeLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          side="bottom"
          sideOffset={10}
          className="rounded-[18px] border border-border bg-popover/96 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.14)] backdrop-blur-xl"
        >
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="rounded-[12px] px-3 py-2.5 text-sm">
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export const TextInputRow = ({
  label,
  desc,
  value,
  placeholder,
  onChange,
  onCommit,
  disabled = false,
  actionLabel = "Save",
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  live = false
}: {
  label: string;
  desc: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  disabled?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  live?: boolean;
}) => (
  <div className="rounded-[24px] border border-border bg-background/55 p-5">
    <div className="mb-4 space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {live ? <Badge variant="secondary">Live</Badge> : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 min-w-0 rounded-[18px] border-border bg-background/85"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          onCommit();
        }}
      />
      <div className="flex gap-3 sm:shrink-0">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-12 rounded-[18px] px-5"
          onClick={onAction ?? onCommit}
        >
          {actionLabel}
        </Button>
        {secondaryActionLabel ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-12 rounded-[18px] px-5"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  </div>
);

export const RadioListRow = ({
  label,
  desc,
  value,
  options,
  onChange
}: {
  label: string;
  desc: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) => (
  <div className="rounded-[24px] border border-border bg-background/55 p-5">
    <div className="mb-4 space-y-1">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
    </div>
    <div className="space-y-2">
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition-colors",
              checked
                ? "border-primary/35 bg-primary/10 text-foreground"
                : "border-border bg-background/75 text-muted-foreground hover:bg-accent/35 hover:text-foreground"
            )}
            onClick={() => onChange(option.value)}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border transition-colors",
                checked ? "border-primary bg-primary/15" : "border-border bg-background"
              )}
            >
              <span className={cn("size-2.5 rounded-full", checked ? "bg-primary" : "bg-transparent")} />
            </span>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);
