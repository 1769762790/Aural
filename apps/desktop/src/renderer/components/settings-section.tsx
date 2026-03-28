import type { PropsWithChildren } from "react";
import { Badge, Card } from "@aural/ui";

interface SettingsSectionProps {
  title: string;
  description: string;
  count: number;
  extra?: string;
}

export const SettingsSection = ({
  title,
  description,
  count,
  extra,
  children
}: PropsWithChildren<SettingsSectionProps>) => (
  <Card style={{ padding: 22, display: "grid", gap: 18, borderRadius: 28 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 8 }}>
        <span
          style={{
            color: "var(--aural-accent)",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase"
          }}
        >
          Preferences
        </span>
        <h3 style={{ margin: 0, fontFamily: "var(--aural-font-display)", fontSize: 24 }}>{title}</h3>
        <p style={{ margin: 0, color: "var(--aural-text-muted)", lineHeight: 1.7 }}>{description}</p>
      </div>
      <Badge>{count} items{extra ? ` / ${extra}` : ""}</Badge>
    </div>
    <div style={{ display: "grid", gap: 14 }}>{children}</div>
  </Card>
);
