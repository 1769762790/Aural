import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { BrowseMode } from "@aural/domain";
import { BarChart3, CircleUserRound, Clock3, Disc3, Heart, Home, ListMusic, type LucideIcon } from "lucide-react";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  to: string;
  label: string;
  note: string;
  icon: LucideIcon;
}

export const localNavItems: SidebarNavItem[] = [
  { to: "/", label: "Home", note: "", icon: Home },
  { to: "/songs", label: "Songs", note: "", icon: ListMusic },
  { to: "/artists", label: "Artists", note: "", icon: CircleUserRound },
  { to: "/albums", label: "Albums", note: "", icon: Disc3 },
  { to: "/collection", label: "Playlists", note: "", icon: ListMusic },
  { to: "/favorites", label: "Favorites", note: "", icon: Heart },
  { to: "/recent", label: "Recent", note: "", icon: Clock3 }
];

export const onlineNavItems: SidebarNavItem[] = [
  { to: "/online", label: "Home", note: "", icon: Home },
  { to: "/online/artists", label: "Artists", note: "", icon: CircleUserRound },
  { to: "/online/albums", label: "Albums", note: "", icon: Disc3 },
  { to: "/online/charts", label: "Charts", note: "", icon: BarChart3 },
  { to: "/online/favorites", label: "Favorites", note: "", icon: Heart },
  { to: "/online/playlists", label: "Playlists", note: "", icon: ListMusic }
];

export const getNavigationItemsForMode = (mode: BrowseMode) => (mode === "online" ? onlineNavItems : localNavItems);

export const SidebarNavigation = ({ mode }: { mode: BrowseMode }) => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0
  });

  const navItems = getNavigationItemsForMode(mode);

  const matchesItemPath = (to: string) => {
    if (to === "/") {
      return location.pathname === "/";
    }

    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const activeItem = navItems
    .filter((item) => matchesItemPath(item.to))
    .sort((left, right) => right.to.length - left.to.length)[0] ?? null;

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeNode = activeItem ? itemRefs.current[activeItem.to] : null;
      const containerNode = containerRef.current;

      if (!activeNode || !containerNode) {
        setIndicatorStyle((current) => ({ ...current, opacity: 0 }));
        return;
      }

      const nextTop = activeNode.offsetTop;
      const nextHeight = activeNode.offsetHeight;
      setIndicatorStyle({
        top: nextTop,
        height: nextHeight,
        opacity: 1
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(() => updateIndicator());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    Object.values(itemRefs.current).forEach((node) => {
      if (node) {
        resizeObserver.observe(node);
      }
    });

    window.addEventListener("resize", updateIndicator);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeItem, location.pathname, mode]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="pointer-events-none absolute left-0 right-0 z-0 overflow-hidden rounded-[18px] border border-primary/60 bg-primary shadow-[0_12px_32px_color-mix(in_srgb,var(--primary)_62%,transparent)] transition-[transform,height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:absolute before:inset-y-[10%] before:left-[8%] before:w-[38%] before:rounded-full before:bg-white/18 before:blur-xl before:content-[''] after:absolute after:inset-y-[18%] after:right-[10%] after:w-[22%] after:rounded-full after:bg-white/10 after:blur-lg after:content-['']"
        style={{
          height: indicatorStyle.height,
          opacity: indicatorStyle.opacity,
          transform: `translateY(${indicatorStyle.top}px)`
        }}
        aria-hidden="true"
      />
      <NavigationMenu
        orientation="vertical"
        className="relative z-10 block w-full max-w-none [&>div:last-child]:hidden"
      >
        <NavigationMenuList className="grid w-full grid-cols-1 items-stretch justify-stretch gap-2 space-x-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem?.to === item.to;

          return (
            <NavigationMenuItem
              key={item.to}
              className="block w-full"
              ref={(node) => {
                itemRefs.current[item.to] = node;
              }}
            >
              <NavigationMenuLink asChild>
                <Link
                  to={item.to}
                  className={cn(
                    "group relative z-10 flex min-h-12 w-full min-w-full items-center gap-3 rounded-[18px] border px-4 py-3 transition-all duration-300",
                    active
                      ? "border-transparent bg-transparent text-primary-foreground"
                      : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-accent/32 hover:text-foreground hover:shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_24%,transparent)]"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    <strong className="text-sm font-semibold">{item.label}</strong>
                    <small className="text-[10px] uppercase tracking-[0.22em] text-current/72">{item.note}</small>
                  </span>
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
};
