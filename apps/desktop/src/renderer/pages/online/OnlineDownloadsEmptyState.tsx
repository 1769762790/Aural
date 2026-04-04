import { PackageOpen } from "lucide-react";

export const OnlineDownloadsEmptyState = ({
  title,
  description
}: {
  title: string;
  description: string;
}) => (
  <div className="flex min-h-[340px] flex-col items-center justify-center gap-5 rounded-[28px] border border-dashed border-border bg-card/36 px-6 py-12 text-center">
    <div className="flex size-20 items-center justify-center rounded-full border border-primary/18 bg-primary/6 text-primary">
      <PackageOpen className="size-10" />
    </div>
    <div className="space-y-2">
      <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</h3>
      <p className="max-w-[26rem] text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  </div>
);
