import { useEffect, useMemo, useRef } from "react";
import { ChevronDown, LogIn, QrCode } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { OnlineLoginDialog } from "./OnlineLoginDialog";
import { useOnlineAccount } from "./useOnlineAccount";

const getAvatarFallback = (nickname: string | null) => {
  if (!nickname?.trim()) {
    return "云";
  }

  const compact = nickname.trim();
  return compact.slice(0, 1).toUpperCase();
};

export const OnlineAccountControl = () => {
  const { user, isLoading, menuOpen, setMenuOpen, dialogOpen, setDialogOpen, applyAuthenticatedUser } = useOnlineAccount();
  const closeTimerRef = useRef<number | null>(null);

  const fallbackText = useMemo(() => getAvatarFallback(user?.nickname ?? null), [user?.nickname]);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setMenuOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 120);
  };

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={user ? `Online account: ${user.nickname}` : "Open online account menu"}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-background/70 transition-colors hover:bg-accent/40"
            onClick={() => setMenuOpen((current) => !current)}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <Avatar className="size-9 border-none">
              <AvatarImage alt={user?.nickname ?? "Online account"} src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className={cn("text-[11px] font-bold", !user && "bg-gradient-to-br from-sky-400/90 via-indigo-400/80 to-violet-400/90")}>
                {fallbackText}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-[280px] rounded-[24px] p-3"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="flex items-center gap-3 rounded-[18px] border border-border/70 bg-background/65 p-3">
            <Avatar className="size-12 border-border/60">
              <AvatarImage alt={user?.nickname ?? "Online account"} src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-sm font-bold">{fallbackText}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.nickname ?? (isLoading ? "正在读取账号信息..." : "未登录网易云音乐")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user ? `UID ${user.userId}` : "登录后可同步喜欢的音乐与每日推荐"}
              </p>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="rounded-[18px] px-3 py-3"
            onSelect={(event) => {
              event.preventDefault();
              setMenuOpen(false);
              setDialogOpen(true);
            }}
          >
            <QrCode className="size-4" />
            <div className="flex flex-col">
              <span className="font-semibold">{user ? "重新登录" : "登录"}</span>
              <span className="text-xs text-muted-foreground">使用网易云音乐 App 扫码登录</span>
            </div>
            <LogIn className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuItem>

          <div className="mt-3 flex items-center justify-between rounded-[18px] border border-border/60 bg-accent/15 px-3 py-2.5 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            <span>Netease Account</span>
            <ChevronDown className="size-3 opacity-60" />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <OnlineLoginDialog open={dialogOpen} onOpenChange={setDialogOpen} onAuthorized={applyAuthenticatedUser} />
    </>
  );
};
