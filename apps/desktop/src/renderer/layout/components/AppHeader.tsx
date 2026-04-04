import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BrowseMode } from "@aural/domain";
import { Button } from "@/components/ui/button";
import { GlobalSearchCommand } from "@renderer/components/GlobalSearchCommand";
import { OnlineAccountControl } from "@renderer/components/online-auth/OnlineAccountControl";
import { AppTopNavigation } from "./AppTopNavigation";

export const AppHeader = ({
  browseMode,
  isDark,
  layoutMode,
  onToggleTheme
}: {
  browseMode: BrowseMode;
  isDark: boolean;
  layoutMode: "vertical" | "horizontal";
  onToggleTheme: () => void;
}) => {
  const navigate = useNavigate();

  if (layoutMode === "horizontal") {
    return (
      <header className="window-drag window-safe-top-sm absolute left-0 right-0 z-20 px-10 py-6  bg-card/72 px-6 py-4 shadow-[0_22px_56px_rgba(0,0,0,0.14)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/64 dark:border-border/90 dark:bg-card/58 dark:shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between gap-6">
          <div className="window-no-drag relative z-10 flex min-w-0 items-center gap-4">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 rounded-full border border-border bg-background/70"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 rounded-full border border-border bg-background/70"
              onClick={() => navigate(1)}
              aria-label="Go forward"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="window-no-drag hidden h-full items-center justify-center xl:flex">
            <AppTopNavigation browseMode={browseMode} />
          </div>

          <div className="window-no-drag relative z-10 flex shrink-0 items-center gap-4">
            <GlobalSearchCommand compact className="hidden w-[240px] md:block xl:w-[260px]" />
            <OnlineAccountControl
              isDark={isDark}
              onOpenDownloads={() => void navigate("/online/downloads")}
              onToggleTheme={onToggleTheme}
              onOpenSettings={() => void navigate("/settings")}
            />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="window-drag window-safe-top-sm relative flex items-center justify-between gap-4 px-5 pb-4 before:absolute before:inset-x-0 before:top-0 before:h-[calc(var(--titlebar-area-height)+24px)] before:bg-gradient-to-b before:from-primary/8 before:to-transparent before:content-['']">
      <GlobalSearchCommand />

      <div className="window-no-drag flex items-center gap-4">
        <OnlineAccountControl
          isDark={isDark}
          onOpenDownloads={() => void navigate("/online/downloads")}
          onToggleTheme={onToggleTheme}
          onOpenSettings={() => void navigate("/settings")}
        />
      </div>
    </header>
  );
};
