import type { DownloadedAssetRecord } from "@aural/contracts";
import { Card, CardContent } from "@/components/ui/card";

export const OnlineDownloadsList = ({
  downloads,
  emptyDescription
}: {
  downloads: DownloadedAssetRecord[];
  emptyDescription: string;
}) => {
  if (!downloads.length) {
    return (
      <Card className="border-border bg-card/78">
        <CardContent className="p-8 text-sm text-muted-foreground">{emptyDescription}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {downloads.map((download) => (
        <Card key={download.itemId} className="border-border bg-card/78">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{download.providerItemId}</p>
              <p className="text-xs text-muted-foreground">{download.localPath}</p>
            </div>
            <span className="rounded-full border border-border bg-background/70 px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {download.status}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
