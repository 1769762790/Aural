import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { OnlineDownloadsList } from "./online/OnlineDownloadsList";
import { OnlinePageShell } from "./online/OnlinePageShell";
import { useOnlineOverviewStats } from "./online/useOnlineOverviewStats";

export const OnlineDownloadsPage = () => {
  const downloads = useAsyncResource(() => bridge.online.listDownloads(), [], "online:downloads:list");
  const { stats } = useOnlineOverviewStats("downloads");

  return (
    <OnlinePageShell
      title="Offline downloads"
      description="Downloaded streamed tracks are tracked separately so you can audit cache state, local paths, and offline readiness without leaving online mode."
      stats={stats}
    >
      <OnlineDownloadsList
        downloads={downloads.data ?? []}
        emptyDescription={downloads.isLoading ? "Loading offline downloads..." : "No offline downloads yet."}
      />
    </OnlinePageShell>
  );
};
