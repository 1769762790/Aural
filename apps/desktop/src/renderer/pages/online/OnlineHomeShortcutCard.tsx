import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const OnlineHomeShortcutCard = ({
  to,
  title,
  description,
  icon: Icon,
  accentClassName
}: {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
}) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-[28px] border border-border/80 bg-card/72 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_28px_64px_rgba(15,23,42,0.14)]"
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.1),transparent_24%),linear-gradient(160deg,rgba(255,255,255,0.04),transparent_62%)] opacity-70" />
    <div className="relative flex items-start justify-between gap-4">
      <span className={cn("flex size-12 items-center justify-center rounded-[18px] text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)]", accentClassName)}>
        <Icon className="size-5" />
      </span>
      <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
    </div>

    <div className="relative mt-8 space-y-2">
      <h3 className="text-xl font-black tracking-[-0.05em] text-foreground">{title}</h3>
      <p className="max-w-[28ch] text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  </Link>
);
