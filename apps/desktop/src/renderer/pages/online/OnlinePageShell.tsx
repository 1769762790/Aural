import type { ReactNode } from "react";

export const OnlinePageShell = ({
  eyebrow = "",
  title,
  description,
  stats,
  children
}: {
  eyebrow?: string;
  title: string;
  description: string;
  stats?: string[];
  children: ReactNode;
}) => (
  <div className="space-y-8">
    <section className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">{eyebrow}</p>
      <div className="space-y-3">
        <h1 className="text-4xl font-black tracking-[-0.08em] text-foreground">{title}</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
    </section>

    {children}
  </div>
);
