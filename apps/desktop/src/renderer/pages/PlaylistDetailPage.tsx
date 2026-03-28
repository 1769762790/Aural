import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import type { Track } from "@aural/domain";
import { MediaDetailView } from "@renderer/components/MediaDetailView";
import { FavoriteToggleButton } from "@renderer/components/FavoriteToggleButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatRuntimeCompact } from "@renderer/lib/formatters";
import { getTrackTime } from "@renderer/lib/playlistArtwork";
import { usePlayerStore } from "@renderer/stores/playerStore";

const buildPlaylistDescription = (artists: string[], genres: string[]) => {
  if (genres.length && artists.length) {
    return `A curated collection of ${genres.slice(0, 2).join(" and ")} textures, shaped by ${artists.slice(0, 2).join(" and ")}.`;
  }

  if (artists.length) {
    return `A curated collection centered around ${artists.slice(0, 3).join(", ")} and the darker corners of the local shelf.`;
  }

  return "A curated collection built from your local library, sequenced for immersive listening and deep-repeat sessions.";
};

export const PlaylistDetailPage = () => {
  const navigate = useNavigate();
  const { playlistId } = useParams();
  const playTracks = usePlayerStore((state) => state.playTracks);
  const [confirmingTrackId, setConfirmingTrackId] = useState<string | null>(null);
  const [removingTrackId, setRemovingTrackId] = useState<string | null>(null);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
  const [confirmDeletePlaylist, setConfirmDeletePlaylist] = useState(false);

  const playlist = useAsyncResource(
    () => (playlistId ? bridge.collection.getPlaylist(playlistId) : Promise.resolve(null)),
    [playlistId],
    playlistId ? `playlist:detail:${playlistId}` : "playlist:detail:none"
  );

  const tracks = playlist.data?.tracks ?? [];
  const latestTrack = tracks.at(-1) ?? null;
  const totalDuration = useMemo(() => tracks.reduce((sum, track) => sum + track.duration, 0), [tracks]);
  const topArtists = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.artist).filter(Boolean))).slice(0, 3),
    [tracks]
  );
  const topGenres = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.genre).filter((genre): genre is string => Boolean(genre)))).slice(0, 3),
    [tracks]
  );

  if (!playlistId) {
    return null;
  }

  if (!playlist.data && !playlist.isLoading) {
    return (
      <Card className="border-border bg-card/78">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-[-0.06em] text-foreground">Playlist not found</h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground">
              This playlist may have been deleted or is no longer available in your local collection.
            </p>
          </div>
          <Button onClick={() => void navigate("/collection")}>Back to Playlists</Button>
        </CardContent>
      </Card>
    );
  }

  const handleRemoveTrack = async (trackId: Track["id"]) => {
    setRemovingTrackId(trackId);
    try {
      await bridge.collection.removeFromPlaylist({
        playlistId,
        trackIds: [trackId]
      });
      setConfirmingTrackId(null);
      await playlist.refresh();
    } finally {
      setRemovingTrackId(null);
    }
  };

  const handleDeletePlaylist = async () => {
    setIsDeletingPlaylist(true);
    try {
      await bridge.collection.deletePlaylist(playlistId);
      setConfirmDeletePlaylist(false);
      void navigate("/collection");
    } finally {
      setIsDeletingPlaylist(false);
    }
  };

  return (
    <MediaDetailView
      backLabel="Back"
      onBack={() => void navigate("/collection")}
      eyebrow="Curated Playlist"
      title={playlist.data?.name ?? "Playlist"}
      description={buildPlaylistDescription(topArtists, topGenres)}
      stats={["The Curator", `${tracks.length} Tracks`, formatRuntimeCompact(totalDuration)]}
      tracks={tracks}
      heroSeed={playlistId}
      heroCoverPath={latestTrack?.coverPath ?? null}
      onPlayAll={() => {
        if (!tracks.length) {
          return;
        }
        void playTracks(tracks, tracks[0]?.id, "playlist", playlistId);
      }}
      onShuffle={() => {
        if (!tracks.length) {
          return;
        }
        const shuffled = [...tracks]
          .sort((left, right) => getTrackTime(right) - getTrackTime(left))
          .sort(() => Math.random() - 0.5);
        void playTracks(shuffled, shuffled[0]?.id, "playlist", `${playlistId}:shuffle`);
      }}
      onTrackPlay={(track) => void playTracks(tracks, track.id, "playlist", playlistId)}
      headerActions={
        <Popover open={confirmDeletePlaylist} onOpenChange={setConfirmDeletePlaylist}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-12 rounded-full border border-border bg-background/70 text-muted-foreground hover:bg-accent/45 hover:text-rose-500"
            >
              <Trash2 className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            className="w-72 rounded-2xl border-border bg-popover/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Delete this playlist?</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  This only deletes the playlist container. Songs in your library will remain untouched.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" className="rounded-full px-4" onClick={() => setConfirmDeletePlaylist(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeletingPlaylist}
                  onClick={() => void handleDeletePlaylist()}
                >
                  Delete
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      }
      renderTrackActions={(track) => (
        <>
          <FavoriteToggleButton
            isFavorite={track.isFavorite}
            onClick={(event) => {
              event.stopPropagation();
              void bridge.collection.toggleFavorite(track.id);
              void playlist.refresh();
            }}
          />

          <Popover open={confirmingTrackId === track.id} onOpenChange={(open) => setConfirmingTrackId(open ? track.id : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground hover:bg-accent/45 hover:text-rose-500"
                onClick={(event) => event.stopPropagation()}
              >
                <Trash2 className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="left"
              className="w-64 rounded-2xl border-border bg-popover/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Remove from this playlist?</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    This only removes <span className="font-medium text-foreground">{track.title}</span> from the current playlist.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full px-4"
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmingTrackId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90"
                    disabled={removingTrackId === track.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRemoveTrack(track.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    />
  );
};
