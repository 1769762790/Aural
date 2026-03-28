import type { SettingKey, SettingValue } from "@aural/domain";
import { Button, Card } from "@aural/ui";
import type { SettingsFieldDefinition } from "./settings-catalog";
import { formatSettingValue, getDefaultSettingValue } from "./settings-catalog";

interface SettingsFieldProps {
  field: SettingsFieldDefinition;
  value: SettingValue | undefined;
  pending?: boolean;
  error?: string | null;
  onChange: (key: SettingKey, value: SettingValue) => void;
}

const shellStyle = (highlighted: boolean) => ({
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 24,
  border: `1px solid ${highlighted ? "rgba(138, 199, 255, 0.32)" : "rgba(171, 205, 255, 0.12)"}`,
  background: highlighted
    ? "linear-gradient(180deg, rgba(138, 199, 255, 0.12), rgba(10, 16, 24, 0.88))"
    : "linear-gradient(180deg, rgba(15, 24, 34, 0.94), rgba(10, 16, 24, 0.78))",
  boxShadow: highlighted ? "0 18px 46px rgba(7, 13, 20, 0.28)" : "0 12px 32px rgba(4, 9, 16, 0.18)"
}) as const;

const controlGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10
} as const;

const buttonBaseStyle = {
  border: "1px solid rgba(171, 205, 255, 0.14)",
  borderRadius: 999,
  background: "rgba(138, 199, 255, 0.08)",
  color: "var(--aural-text)",
  padding: "11px 14px",
  cursor: "pointer",
  transition: "transform 160ms ease, border-color 160ms ease, background-color 160ms ease"
} as const;

const controlLabelStyle = {
  display: "grid",
  gap: 4
} as const;

const mutedTextStyle = {
  margin: 0,
  color: "var(--aural-text-muted)",
  lineHeight: 1.6,
  fontSize: 14
} as const;

const summaryBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  border: "1px solid rgba(138, 199, 255, 0.18)",
  background: "rgba(138, 199, 255, 0.12)",
  color: "var(--aural-text)",
  padding: "6px 10px",
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
} as const;

const formatVolumeValue = (raw: SettingValue | undefined) => Math.round(Number(raw ?? getDefaultSettingValue("player.volume")) * 100);

export const SettingsField = ({ field, value, pending, error, onChange }: SettingsFieldProps) => {
  const currentValue = value ?? getDefaultSettingValue(field.key);
  const summary = formatSettingValue(field.key, currentValue);

  return (
    <Card style={shellStyle(Boolean(pending))}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div style={controlLabelStyle}>
          <strong style={{ fontSize: 18, letterSpacing: "0.02em" }}>{field.label}</strong>
          <p style={mutedTextStyle}>{field.description}</p>
        </div>
        <span style={summaryBadgeStyle}>{pending ? "Saving" : summary}</span>
      </div>

      {renderControl(field, currentValue, onChange)}

      {error ? (
        <p style={{ margin: 0, color: "var(--aural-danger)", fontSize: 13 }}>{error}</p>
      ) : (
        <p style={{ margin: 0, color: "var(--aural-text-faint)", fontSize: 12 }}>
          Default: {formatSettingValue(field.key, getDefaultSettingValue(field.key))}
        </p>
      )}
    </Card>
  );
};

const renderControl = (
  field: SettingsFieldDefinition,
  value: SettingValue,
  onChange: (key: SettingKey, nextValue: SettingValue) => void
) => {
  if (field.kind === "toggle") {
    const enabled = Boolean(value);
    return (
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => onChange(field.key, !enabled)}
        style={{
          ...buttonBaseStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderColor: enabled ? "rgba(138, 199, 255, 0.32)" : buttonBaseStyle.border,
          background: enabled ? "rgba(138, 199, 255, 0.16)" : buttonBaseStyle.background
        }}
      >
        <span>{enabled ? "Enabled" : "Disabled"}</span>
        <span style={{ color: "var(--aural-text-muted)", fontSize: 12 }}>{enabled ? "On" : "Off"}</span>
      </button>
    );
  }

  if (field.kind === "slider") {
    const sliderValue = formatVolumeValue(value);
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <input
          type="range"
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          value={sliderValue}
          onChange={(event) => onChange(field.key, Number(event.target.value) / 100)}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--aural-text-muted)", fontSize: 12 }}>
          <span>{field.min ?? 0}%</span>
          <strong style={{ color: "var(--aural-text)", fontSize: 18 }}>{sliderValue}%</strong>
          <span>{field.max ?? 100}%</span>
        </div>
      </div>
    );
  }

  if (field.kind === "swatches") {
    return (
      <div style={controlGridStyle}>
        {field.options?.map((option) => {
          const selected = option.value === value;
          return (
            <button
              type="button"
              key={String(option.value)}
              onClick={() => onChange(field.key, option.value)}
              style={{
                ...buttonBaseStyle,
                minWidth: 102,
                borderColor: selected ? "rgba(138, 199, 255, 0.34)" : buttonBaseStyle.border,
                background: selected ? "rgba(138, 199, 255, 0.16)" : buttonBaseStyle.background
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  marginRight: 8,
                  background: option.swatch ?? "#8ac7ff",
                  boxShadow: selected ? `0 0 0 6px ${option.swatch ?? "#8ac7ff"}22` : "none"
                }}
              />
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  const segmentedOptions = field.options ?? [];
  return (
    <div style={controlGridStyle}>
      {segmentedOptions.map((option) => {
        const selected = option.value === value;
        return (
          <Button
            key={String(option.value)}
            variant={selected ? "soft" : "ghost"}
            onClick={() => onChange(field.key, option.value)}
            style={{
              minWidth: 96,
              borderColor: selected ? "rgba(138, 199, 255, 0.32)" : undefined,
              background: selected ? "rgba(138, 199, 255, 0.14)" : undefined
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
};
