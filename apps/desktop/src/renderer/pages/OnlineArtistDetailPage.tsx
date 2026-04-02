import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MediaDetailView } from "@renderer/components/MediaDetailView";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatRuntimeCompact } from "@renderer/lib/formatters";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { useOnlineItemActions } from "./online/useOnlineItemActions";

const buildOnlineArtistDescription = (artistName: string, albums: string[], genres: string[]) => {
  if (genres.length) {
    return `${artistName} is grouped from streamed tracks spanning ${genres.slice(0, 2).join(" and ")}, so the online catalog can be browsed as a focused artist page instead of a loose search trail.`;
  }

  if (albums.length) {
    return `Everything currently discovered for ${artistName}, anchored by releases like ${albums.slice(0, 2).join(" and ")} from your online listening flow.`;
  }

  return `A focused online view of ${artistName}, assembled from the streamed tracks already discovered in Aural.`;
};

export const OnlineArtistDetailPage = () => {
  const navigate = useNavigate();
  const { artistId } = useParams();
  const playItems = usePlayerStore((state) => state.playItems);

  const detail = useAsyncResource(
    () => (artistId ? bridge.online.getArtistDetail(artistId) : Promise.resolve(null)),
    [artistId],
    artistId ? `online:artist:detail:${artistId}` : "online:artist:detail:none"
  );
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "online:artist:playlists");
  const tracks = detail.data?.tracks ?? [];
  const albums = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.album).filter(Boolean))).slice(0, 3),
    [tracks]
  );
  const genres = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.genre).filter((genre): genre is string => Boolean(genre)))).slice(0, 3),
    [tracks]
  );
  const { renderItemActions } = useOnlineItemActions({
    playlists: playlists.data ?? [],
    refreshPlaylists: playlists.refresh,
    onFavoriteToggled: () => {
      void detail.refresh();
    }
  });

  if (!artistId) {
    return null;
  }

  if (!detail.data && !detail.isLoading) {
    return (
      <Card className="border-border bg-card/78">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-[-0.06em] text-foreground">Artist not found</h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground">
              This online artist view is not available yet. Search or play more streamed tracks to grow the online artist index.
            </p>
          </div>
          <Button onClick={() => void navigate("/online/artists")}>Back to Online Artists</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <MediaDetailView
      backLabel="Online Artists"
      onBack={() => void navigate("/online/artists")}
      eyebrow="Online Artist"
      title={detail.data?.name ?? "Artist"}
      description={buildOnlineArtistDescription(detail.data?.name ?? "This artist", albums, genres)}
      stats={[
        detail.data?.name ?? "Artist",
        `${detail.data?.trackCount ?? 0} Tracks`,
        formatRuntimeCompact(detail.data?.totalDurationSeconds ?? 0)
      ]}
      tracks={tracks}
      heroSeed={artistId}
      heroCoverPath={detail.data?.coverPath ?? null}
      heroCoverUrl={detail.data?.coverUrl ?? null}
      onPlayAll={() => {
        if (!tracks.length) {
          return;
        }
        void playItems(tracks, tracks[0]?.id, "artist", artistId);
      }}
      onShuffle={() => {
        if (!tracks.length) {
          return;
        }
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        void playItems(shuffled, shuffled[0]?.id, "artist", `${artistId}:shuffle`);
      }}
      onTrackPlay={(track) => void playItems(tracks, track.id, "artist", artistId)}
      renderTrackActions={renderItemActions}
    />
  );
};
