import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MediaDetailView } from "@renderer/components/MediaDetailView";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatRuntimeCompact } from "@renderer/lib/formatters";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { useOnlineItemActions } from "./online/useOnlineItemActions";

const buildAlbumDescription = (title: string, artist: string, description: string, company: string | null) => {
  if (description.trim().length) {
    return description;
  }

  if (company) {
    return `${title} by ${artist}, released through ${company}.`;
  }

  return `${title} by ${artist}, collected from the online album catalog.`;
};

export const OnlineAlbumDetailPage = () => {
  const navigate = useNavigate();
  const { albumId } = useParams();
  const playItems = usePlayerStore((state) => state.playItems);

  const detail = useAsyncResource(
    () => (albumId ? bridge.online.getAlbumDetail(albumId) : Promise.resolve(null)),
    [albumId],
    albumId ? `online:album:detail:${albumId}` : "online:album:detail:none"
  );
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "online:album:detail:playlists");
  const tracks = detail.data?.items ?? [];
  const { renderItemActions } = useOnlineItemActions({
    playlists: playlists.data ?? [],
    refreshPlaylists: playlists.refresh,
    onFavoriteToggled: () => {
      void detail.refresh();
    }
  });

  if (!albumId) {
    return null;
  }

  if (!detail.data && !detail.isLoading) {
    return (
      <Card className="border-border bg-card/78">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-[-0.06em] text-foreground">Album not found</h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground">
              This online album is currently unavailable. Try refreshing the album archive and open it again.
            </p>
          </div>
          <Button onClick={() => void navigate("/online/albums")}>Back to Online Albums</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <MediaDetailView
      backLabel="Online Albums"
      onBack={() => void navigate("/online/albums")}
      title={detail.data?.title ?? "Album"}
      description={buildAlbumDescription(
        detail.data?.title ?? "Album",
        detail.data?.artist ?? "Unknown Artist",
        detail.data?.description ?? "",
        detail.data?.company ?? null
      )}
      stats={[
        detail.data?.artist ?? "Unknown Artist",
        `${detail.data?.trackCount ?? tracks.length} Tracks`,
        detail.data?.year ? String(detail.data.year) : formatRuntimeCompact(detail.data?.totalDurationSeconds ?? 0)
      ]}
      tracks={tracks}
      heroSeed={albumId}
      heroCoverPath={null}
      heroCoverUrl={detail.data?.coverUrl ?? null}
      onPlayAll={() => {
        if (!tracks.length) {
          return;
        }
        void playItems(tracks, tracks[0]?.id, "album", `online-album:${albumId}`);
      }}
      onShuffle={() => {
        if (!tracks.length) {
          return;
        }
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        void playItems(shuffled, shuffled[0]?.id, "album", `online-album:${albumId}:shuffle`);
      }}
      onTrackPlay={(track) => void playItems(tracks, track.id, "album", `online-album:${albumId}`)}
      renderTrackActions={renderItemActions}
    />
  );
};
