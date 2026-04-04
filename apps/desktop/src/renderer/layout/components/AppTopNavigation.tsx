import { Link, useLocation } from "react-router-dom";
import type { BrowseMode } from "@aural/domain";
import { cn } from "@/lib/utils";
import { getNavigationItemsForMode } from "@renderer/components/SidebarNavigation";

export const AppTopNavigation = ({ browseMode }: { browseMode: BrowseMode }) => {
  const location = useLocation();
  const navItems = getNavigationItemsForMode(browseMode);

  const matchesItemPath = (to: string) => {
    if (to === "/") {
      return location.pathname === "/";
    }

    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const activeItem =
    navItems
      .filter((item) => matchesItemPath(item.to))
      .sort((left, right) => right.to.length - left.to.length)[0] ?? null;

  return (
    <nav className="hidden items-center justify-center gap-2 xl:flex">
      {navItems.map((item) => {
        const active = activeItem?.to === item.to;

        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
                : "text-muted-foreground hover:bg-accent/55 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
