interface DashboardSectionHeaderProps {
  eyebrow: string;
  title: string;
}

export const DashboardSectionHeader = ({ eyebrow, title }: DashboardSectionHeaderProps) => (
  <div className="space-y-2">
    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/88">{eyebrow}</p>
    <h2 className="text-3xl font-black tracking-[-0.06em] text-foreground md:text-4xl">{title}</h2>
  </div>
);
