import { FolderOpen } from "lucide-react";
import type { DownloadedAssetRecord } from "@aural/contracts";
import type { PlayableItem } from "@aural/domain";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDuration } from "@renderer/lib/formatters";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";

const progressMeta = {
  pending: {
    ratio: 0.42,
    label: "等待下载",
    helper: "正在准备离线缓存",
    barClassName: "bg-primary"
  },
  ready: {
    ratio: 1,
    label: "已完成",
    helper: "已保存到本地目录",
    barClassName: "bg-primary"
  },
  failed: {
    ratio: 1,
    label: "下载失败",
    helper: "请稍后重新尝试",
    barClassName: "bg-destructive"
  }
} satisfies Record<
  DownloadedAssetRecord["status"],
  { ratio: number; label: string; helper: string; barClassName: string }
>;

export const OnlineDownloadsTable = ({
  downloads,
  itemsById,
  onOpenPath
}: {
  downloads: DownloadedAssetRecord[];
  itemsById: Map<string, PlayableItem | null>;
  onOpenPath: (path: string) => void;
}) => (
  <div className="overflow-hidden rounded-[28px] border border-border bg-card/58 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
    <Table>
      <TableHeader className="[&_tr]:border-border/80">
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-14 px-6 text-sm font-medium text-muted-foreground">音乐标题</TableHead>
          <TableHead className="h-14 w-[40%] px-6 text-sm font-medium text-muted-foreground">进度</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {downloads.map((download) => {
          const item = itemsById.get(download.itemId) ?? null;
          const coverUrl = resolvePlayableCoverUrl(item);
          const meta = progressMeta[download.status];

          return (
            <TableRow key={download.itemId} className="border-border/70 hover:bg-accent/20">
              <TableCell className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div
                    className="size-14 shrink-0 rounded-[18px] border border-border bg-cover bg-center shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                    style={
                      coverUrl
                        ? { backgroundImage: `url("${coverUrl}")` }
                        : { backgroundImage: "linear-gradient(135deg, hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.2))" }
                    }
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-base font-semibold text-foreground">
                      {item?.title ?? download.providerItemId}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item?.artist ?? "Unknown Artist"}
                      {item?.duration ? ` · ${formatDuration(item.duration)}` : ""}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-6 py-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {download.status === "ready" && download.downloadedAt
                          ? `${meta.helper} · ${formatDateTime(download.downloadedAt)}`
                          : meta.helper}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 rounded-full border border-border bg-background/80 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      onClick={() => onOpenPath(download.localPath)}
                    >
                      <FolderOpen className="size-4" />
                      打开目录
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          meta.barClassName,
                          download.status === "pending" && "animate-pulse"
                        )}
                        style={{ width: `${meta.ratio * 100}%` }}
                      />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{download.localPath}</p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);
