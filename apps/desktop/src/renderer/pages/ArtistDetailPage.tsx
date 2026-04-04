import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FavoriteToggleButton } from "@renderer/components/FavoriteToggleButton";
import { MediaDetailView } from "@renderer/components/MediaDetailView";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatRuntimeCompact } from "@renderer/lib/formatters";
import { tracksToPlayableItems } from "@renderer/lib/playable";
import { getTrackTime } from "@renderer/lib/playlistArtwork";
import { usePlayerStore } from "@renderer/stores/playerStore";

const buildArtistDescription = (artistName: string, albums: string[], genres: string[]) => {
  if (genres.length) {
    return `${artistName} across ${genres.slice(0, 2).join(" and ")} textures, collected from your local shelf and grouped into one continuous detail view.`;
  }

  if (albums.length) {
    return `A focused view of ${artistName}, anchored by albums like ${albums.slice(0, 2).join(" and ")} from your imported library.`;
  }

  return `Everything currently indexed for ${artistName}, assembled from your local files and ready to play in sequence.`;
};

export const ArtistDetailPage = () => {
  const navigate = useNavigate();
  const { artistId } = useParams();
  const playTracks = usePlayerStore((state) => state.playTracks);

  const detail = useAsyncResource(
    () => (artistId ? bridge.library.getArtistDetail(artistId) : Promise.resolve(null)),
    [artistId],
    artistId ? `artist:detail:${artistId}` : "artist:detail:none"
  );

  const tracks = detail.data?.tracks ?? [];
  const albums = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.album).filter(Boolean))).slice(0, 3),
    [tracks]
  );
  const genres = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.genre).filter((genre): genre is string => Boolean(genre)))).slice(0, 3),
    [tracks]
  );

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
              This artist summary is not available yet. Try rescanning your library to rebuild the index.
            </p>
          </div>
          <Button onClick={() => void navigate("/artists")}>Back to Artists</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <MediaDetailView
      backLabel="Artists"
      onBack={() => void navigate("/artists")}
      eyebrow="Artist Focus"
      title={detail.data?.name ?? "Artist"}
      description={buildArtistDescription(detail.data?.name ?? "This artist", albums, genres)}
      stats={[
        detail.data?.name ?? "Artist",
        `${detail.data?.trackCount ?? 0} Tracks`,
        formatRuntimeCompact(detail.data?.totalDurationSeconds ?? 0)
      ]}
      tracks={tracksToPlayableItems(tracks)}
      heroSeed={artistId}
      heroCoverPath={detail.data?.coverPath ?? null}
      onPlayAll={() => {
        if (!tracks.length) {
          return;
        }
        void playTracks(tracks, tracks[0]?.id, "artist", artistId);
      }}
      onShuffle={() => {
        if (!tracks.length) {
          return;
        }
        const shuffled = [...tracks]
          .sort((left, right) => getTrackTime(right) - getTrackTime(left))
          .sort(() => Math.random() - 0.5);
        void playTracks(shuffled, shuffled[0]?.id, "artist", `${artistId}:shuffle`);
      }}
      onTrackPlay={(track) => void playTracks(tracks, track.id, "artist", artistId)}
      renderTrackActions={(track) => (
        <FavoriteToggleButton
          isFavorite={track.isFavorite}
          onClick={(event) => {
            event.stopPropagation();
            void bridge.collection.toggleFavorite(track.id);
            void detail.refresh();
          }}
        />
      )}
    />
  );
};
