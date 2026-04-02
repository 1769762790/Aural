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

const buildAlbumDescription = (title: string, artist: string, year: number | null, genres: string[]) => {
  const yearLabel = year ? ` from ${year}` : "";
  if (genres.length) {
    return `${title}${yearLabel} by ${artist}, grouped from your local library with ${genres.slice(0, 2).join(" and ")} tones leading the sequence.`;
  }

  return `${title}${yearLabel} by ${artist}, with all locally indexed tracks collected into one reusable detail surface.`;
};

export const AlbumDetailPage = () => {
  const navigate = useNavigate();
  const { albumId } = useParams();
  const playTracks = usePlayerStore((state) => state.playTracks);

  const detail = useAsyncResource(
    () => (albumId ? bridge.library.getAlbumDetail(albumId) : Promise.resolve(null)),
    [albumId],
    albumId ? `album:detail:${albumId}` : "album:detail:none"
  );

  const tracks = detail.data?.tracks ?? [];
  const genres = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.genre).filter((genre): genre is string => Boolean(genre)))).slice(0, 3),
    [tracks]
  );

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
              This album summary is not available yet. Try rescanning your library to rebuild the index.
            </p>
          </div>
          <Button onClick={() => void navigate("/albums")}>Back to Albums</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <MediaDetailView
      backLabel="Albums"
      onBack={() => void navigate("/albums")}
      eyebrow="Album Focus"
      title={detail.data?.title ?? "Album"}
      description={buildAlbumDescription(detail.data?.title ?? "Album", detail.data?.artist ?? "Unknown Artist", detail.data?.year ?? null, genres)}
      stats={[
        detail.data?.artist ?? "Unknown Artist",
        `${detail.data?.trackCount ?? 0} Tracks`,
        formatRuntimeCompact(detail.data?.totalDurationSeconds ?? 0)
      ]}
      tracks={tracksToPlayableItems(tracks)}
      heroSeed={albumId}
      heroCoverPath={detail.data?.coverPath ?? null}
      onPlayAll={() => {
        if (!tracks.length) {
          return;
        }
        void playTracks(tracks, tracks[0]?.id, "album", albumId);
      }}
      onShuffle={() => {
        if (!tracks.length) {
          return;
        }
        const shuffled = [...tracks]
          .sort((left, right) => getTrackTime(right) - getTrackTime(left))
          .sort(() => Math.random() - 0.5);
        void playTracks(shuffled, shuffled[0]?.id, "album", `${albumId}:shuffle`);
      }}
      onTrackPlay={(track) => void playTracks(tracks, track.id, "album", albumId)}
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
