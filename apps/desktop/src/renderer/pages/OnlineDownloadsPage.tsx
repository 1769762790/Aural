import { useMemo, useState } from "react";
import { HardDriveDownload, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { OnlineDownloadsEmptyState } from "./online/OnlineDownloadsEmptyState";
import { OnlineDownloadsTable } from "./online/OnlineDownloadsTable";

type DownloadTab = "active" | "completed";

export const OnlineDownloadsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<DownloadTab>("active");
  const downloads = useAsyncResource(() => bridge.online.listDownloads(), [], "online:downloads:list");
  const itemIds = useMemo(() => (downloads.data ?? []).map((entry) => entry.itemId), [downloads.data]);
  const downloadItems = useAsyncResource(
    () => Promise.all(itemIds.map(async (itemId) => [itemId, await bridge.online.getTrack(itemId)] as const)),
    [itemIds.join("|")],
    `online:downloads:items:${itemIds.join("|")}`
  );

  const itemsById = useMemo(() => new Map(downloadItems.data ?? []), [downloadItems.data]);
  const activeDownloads = useMemo(
    () => (downloads.data ?? []).filter((entry) => entry.status !== "ready"),
    [downloads.data]
  );
  const completedDownloads = useMemo(
    () => (downloads.data ?? []).filter((entry) => entry.status === "ready"),
    [downloads.data]
  );

  const openPath = (targetPath: string) => {
    void bridge.system.openPath(targetPath);
  };

  return (
    <div className="space-y-8 px-7 py-7">
      <section className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 gap-2 rounded-full px-5"
              onClick={() => void navigate("/settings#online")}
            >
              <Settings2 className="size-4" />
              Download Settings
            </Button>
            <Button type="button" className="h-12 gap-2 rounded-full px-5" disabled>
              <HardDriveDownload className="size-4" />
              Download All
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as DownloadTab)} className="w-full">
          <TabsList className="gap-8">
            <TabsTrigger className="h-11 text-sm tracking-[0.26em] data-[state=active]:text-primary" value="active">
              Active
            </TabsTrigger>
            <TabsTrigger className="h-11 text-sm tracking-[0.26em] data-[state=active]:text-primary" value="completed">
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-foreground">
                  当前下载中 ({activeDownloads.length})
                </h2>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {downloads.data?.length ?? 0} items total
              </span>
            </div>

            {activeDownloads.length ? (
              <OnlineDownloadsTable downloads={activeDownloads} itemsById={itemsById} onOpenPath={openPath} />
            ) : (
              <OnlineDownloadsEmptyState
                title="还没有下载的音乐"
                description="当前没有进行中的下载任务，快去下载喜欢的音乐吧～"
              />
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-foreground">
                  已完成下载 ({completedDownloads.length})
                </h2>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {downloads.data?.length ?? 0} items total
              </span>
            </div>

            {completedDownloads.length ? (
              <OnlineDownloadsTable downloads={completedDownloads} itemsById={itemsById} onOpenPath={openPath} />
            ) : (
              <OnlineDownloadsEmptyState
                title="暂无已完成下载"
                description="下载完成的音乐会显示在这里，你可以随时打开本地目录查看。"
              />
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};
