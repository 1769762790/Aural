import { useCallback } from "react";
import type { OnlineUserProfile } from "@aural/contracts";
import { LoaderCircle, LockKeyhole, QrCode, RefreshCcw, Smartphone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useQrLoginSession } from "./useQrLoginSession";

interface OnlineLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorized: (user: OnlineUserProfile | null) => void | Promise<void>;
}

const statusToneClassName: Record<string, string> = {
  idle: "text-muted-foreground",
  creating: "text-primary",
  waiting: "text-muted-foreground",
  scanned: "text-amber-500",
  authorized: "text-emerald-500",
  expired: "text-destructive",
  error: "text-destructive"
};

export const OnlineLoginDialog = ({ open, onOpenChange, onAuthorized }: OnlineLoginDialogProps) => {
  const handleAuthorized = useCallback(
    async (user: OnlineUserProfile | null) => {
      await onAuthorized(user);
    },
    [onAuthorized]
  );

  const { session, state, message, error, refreshSession } = useQrLoginSession({
    open,
    enabled: true,
    onAuthorized: handleAuthorized
  });

  const isBusy = state === "creating";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[860px] overflow-hidden rounded-[32px] border-border/60 bg-[linear-gradient(180deg,rgba(10,10,14,0.96),rgba(14,14,20,0.98))] p-0 text-white shadow-[0_28px_120px_rgba(0,0,0,0.52)]">
        <div className="grid min-h-[560px] grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative hidden overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.3),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(32,208,255,0.16),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-white/70">
                Connect Music
              </span>
              <div className="space-y-4">
                <h2 className="max-w-md text-[2.8rem] font-black leading-[0.92] tracking-[-0.07em] text-white">
                  登录你的网易云音乐账号
                </h2>
                <p className="max-w-md text-sm leading-7 text-white/62">
                  扫码后即可同步喜欢的音乐、每日推荐和账号头像，在线内容会按你的账号状态自动更新。
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-[26px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                  <Smartphone className="size-5 text-white/80" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">扫码登录已启用</p>
                  <p className="text-xs text-white/52">账号密码登录先保留视觉结构，暂不开放提交。</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-white/54">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  登录成功后自动保存 Cookie
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  头像和账号昵称立即同步
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[560px] flex-col bg-[linear-gradient(180deg,rgba(18,18,22,0.98),rgba(12,12,16,0.98))] p-8">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-black tracking-[-0.05em] text-white">账号登录</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-white/54">
                当前先开放扫码登录。登录成功后，右上角头像会自动切换成你的网易云账号头像。
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="qr" className="mt-8 flex flex-1 flex-col">
              <TabsList className="border-white/10">
                <TabsTrigger className="data-[state=active]:border-violet-400 data-[state=active]:text-white" value="account">
                  Account Login
                </TabsTrigger>
                <TabsTrigger className="data-[state=active]:border-violet-400 data-[state=active]:text-white" value="qr">
                  QR Code Login
                </TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="mt-8 flex flex-1 flex-col">
                <div className="space-y-6 rounded-[28px] border border-white/8 bg-white/[0.03] p-7">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-500/18 text-violet-200">
                    <UserRound className="size-6" />
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-xl font-bold text-white">VibeMusic</p>
                    <p className="text-sm text-white/48">账号密码登录界面保留，后续再接完整链路。</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">用户名 / 邮箱</label>
                      <Input className="rounded-2xl border-white/10 bg-white/6 text-white placeholder:text-white/28" disabled value="curator@sonicgallery.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">密码</label>
                      <div className="relative">
                        <Input className="rounded-2xl border-white/10 bg-white/6 pr-11 text-white placeholder:text-white/28" disabled type="password" value="************" />
                        <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/28" />
                      </div>
                    </div>
                  </div>
                  <Button className="h-12 rounded-2xl bg-violet-500/80 text-white hover:bg-violet-400" disabled>
                    Sign In
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="qr" className="mt-8 flex flex-1 flex-col">
                <div className="flex flex-1 flex-col items-center justify-between rounded-[28px] border border-white/8 bg-white/[0.03] p-8 text-center">
                  <div className="space-y-5">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-500/18 text-violet-200">
                      <QrCode className="size-6" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-white">扫码登录</p>
                      <p className="mx-auto max-w-[280px] text-sm leading-6 text-white/48">
                        打开网易云音乐 App，进入扫一扫，对准下方二维码完成登录。
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-5">
                    <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                      <div className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 opacity-70" />
                      <div className="flex size-[230px] items-center justify-center rounded-[20px] bg-[#f3f2f7]">
                        {session?.qrImageUrl ? (
                          <img alt="Netease QR code" className="size-[182px] rounded-[16px] object-contain" src={session.qrImageUrl} />
                        ) : (
                          <div className="flex size-[182px] items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-white">
                            <LoaderCircle className={cn("size-8 text-slate-500", isBusy && "animate-spin")} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className={cn("text-sm font-semibold", statusToneClassName[state])}>{message}</p>
                      {error ? <p className="max-w-[320px] text-xs leading-5 text-destructive">{error}</p> : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-full border-white/10 bg-white/6 px-5 text-white hover:bg-white/10"
                      onClick={() => void refreshSession()}
                    >
                      {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                      刷新二维码
                    </Button>
                    <p className="text-xs leading-5 text-white/36">二维码通常在短时间内有效，若已过期请重新生成。</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
