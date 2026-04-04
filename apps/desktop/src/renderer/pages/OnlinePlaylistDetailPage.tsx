import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MediaDetailView } from "@renderer/components/MediaDetailView";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatRuntimeCompact } from "@renderer/lib/formatters";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { useOnlineItemActions } from "./online/useOnlineItemActions";

export const OnlinePlaylistDetailPage = () => {
  const navigate = useNavigate();
  const { playlistId } = useParams();
  const playItems = usePlayerStore((state) => state.playItems);

  const detail = useAsyncResource(
    () => (playlistId ? bridge.online.getPlaylistDetail(playlistId) : Promise.resolve(null)),
    [playlistId],
    playlistId ? `online:playlist:detail:${playlistId}` : "online:playlist:detail:none"
  );
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "online:playlist:detail:playlists");
  const tracks = detail.data?.items ?? [];
  const { renderItemActions } = useOnlineItemActions({
    playlists: playlists.data ?? [],
    refreshPlaylists: playlists.refresh,
    onFavoriteToggled: () => {
      void detail.refresh();
    }
  });

  if (!playlistId) {
    return null;
  }

  if (!detail.data && !detail.isLoading) {
    return (
      <Card className="border-border bg-card/78">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-[-0.06em] text-foreground">Playlist not found</h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground">
              This online playlist is currently unavailable. Try refreshing the recommendation card and open it again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <MediaDetailView
      backLabel="Online Playlists"
      onBack={() => void navigate("/online/playlists")}
      title={detail.data?.name ?? "Playlist"}
      description={detail.data?.description ?? "A streamed playlist from your online recommendation flow."}
      stats={[
        detail.data?.name ?? "Playlist",
        `${detail.data?.trackCount ?? tracks.length} Tracks`,
        formatRuntimeCompact(detail.data?.totalDurationSeconds ?? 0)
      ]}
      tracks={tracks}
      heroSeed={playlistId}
      heroCoverPath={null}
      heroCoverUrl={detail.data?.coverUrl ?? null}
      onPlayAll={() => {
        if (!tracks.length) {
          return;
        }
        void playItems(tracks, tracks[0]?.id, "playlist", `online-playlist:${playlistId}`);
      }}
      onShuffle={() => {
        if (!tracks.length) {
          return;
        }
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        void playItems(shuffled, shuffled[0]?.id, "playlist", `online-playlist:${playlistId}:shuffle`);
      }}
      onTrackPlay={(track) => void playItems(tracks, track.id, "playlist", `online-playlist:${playlistId}`)}
      renderTrackActions={renderItemActions}
    />
  );
};
