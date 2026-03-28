import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { PlaylistDetail } from "@aural/contracts";
import type { Track } from "@aural/domain";
import { Plus } from "lucide-react";
import { CollectionHeroCard } from "@/components/CollectionHeroCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatCount } from "@renderer/lib/formatters";
import {
  buildPlaylistCardArtwork,
  getTrackTime
} from "@renderer/lib/playlistArtwork";
import { usePlayerStore } from "@renderer/stores/playerStore";

export const CollectionPage = () => {
  const navigate = useNavigate();
  const playTracks = usePlayerStore((state) => state.playTracks);
  const [createName, setCreateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "collection:playlists");
  const favorites = useAsyncResource(() => bridge.collection.getFavorites(), [], "collection:favorites");
  const playlistSignature = useMemo(
    () => (playlists.data ?? []).map((playlist) => `${playlist.id}:${playlist.updatedAt}`).join("|") || "__empty__",
    [playlists.data]
  );

  const playlistDetails = useAsyncResource<Record<string, PlaylistDetail | null>>(
    async () => {
      const entries = await Promise.all(
        (playlists.data ?? []).map(async (playlist) => [playlist.id, await bridge.collection.getPlaylist(playlist.id)] as const)
      );
      return Object.fromEntries(entries);
    },
    [playlistSignature],
    `collection:playlist-details:${playlistSignature}`
  );

  const recentFavorites = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        album: string;
        artist: string;
        latestTrack: Track;
        tracks: Track[];
      }
    >();

    const sortedFavorites = [...(favorites.data ?? [])].sort((left, right) => getTrackTime(right) - getTrackTime(left));

    sortedFavorites.forEach((track) => {
      const album = track.album?.trim() || track.title;
      const artist = track.albumArtist?.trim() || track.artist?.trim() || "Unknown Artist";
      const key = `${album}::${artist}`;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          key,
          album,
          artist,
          latestTrack: track,
          tracks: [track]
        });
        return;
      }

      existing.tracks.push(track);
    });

    return Array.from(grouped.values()).slice(0, 2);
  }, [favorites.data]);

  const galleryCards = useMemo(
    () =>
      (playlists.data ?? []).map((playlist) => {
        const detail = playlistDetails.data?.[playlist.id] ?? null;
        const latestTrack = detail?.tracks.at(-1) ?? null;

        return {
          playlist,
          detail,
          latestTrack
        };
      }),
    [playlistDetails.data, playlists.data]
  );

  const handleCreatePlaylist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = createName.trim();
    if (!name) {
      setCreateError("Enter a playlist name first.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await bridge.collection.createPlaylist({ name });
      setCreateName("");
      setIsCreateModalOpen(false);
      await Promise.all([playlists.refresh(), playlistDetails.refresh()]);
      void navigate(`/collection/${created.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not create playlist.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-[-0.08em] text-foreground md:text-4xl">My Collections</h1>
        </div>

        <div className="flex flex-1 justify-end">
          <Button
            type="button"
            size="icon"
            className="size-12 rounded-full bg-primary text-primary-foreground shadow-[0_14px_36px_rgba(120,89,255,0.34)]"
            onClick={() => {
              setCreateError(null);
              setCreateName("");
              setIsCreateModalOpen(true);
            }}
            aria-label="Create playlist"
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </div>

      <section className="space-y-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">Recent Favorites</div>

        {recentFavorites.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {recentFavorites.map((albumGroup) => (
              <CollectionHeroCard
                key={albumGroup.key}
                seed={albumGroup.key}
                coverPath={albumGroup.latestTrack.coverPath}
                title={albumGroup.album}
                subtitle={`${albumGroup.artist} • ${formatCount(albumGroup.tracks.length, "favorite tracks")}`}
                onPlay={() =>
                  void playTracks(
                    [...albumGroup.tracks].sort((left, right) => getTrackTime(right) - getTrackTime(left)),
                    albumGroup.latestTrack.id,
                    "favorites",
                    `favorites-album:${albumGroup.key}`
                  )
                }
                onOpen={() => void navigate("/favorites")}
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-[28px] border border-dashed border-border bg-card/60">
            <CardContent className="flex min-h-[230px] items-center justify-center">
              <span className="text-3xl font-black tracking-[0.22em] text-muted-foreground/45">Empty</span>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">My Personal Galleries</div>

        {galleryCards.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {galleryCards.map(({ playlist, detail, latestTrack }) => (
              <button
                key={playlist.id}
                type="button"
                className="group text-left"
                onClick={() => void navigate(`/collection/${playlist.id}`)}
              >
                <div className="space-y-4">
                  <div
                    className={cn(
                      "aspect-square rounded-[26px] border border-border bg-cover bg-center shadow-[0_18px_42px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_28px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_42px_rgba(0,0,0,0.2)] dark:group-hover:shadow-[0_28px_60px_rgba(0,0,0,0.28)]",
                      !detail?.tracks.length && "cursor-default"
                    )}
                    style={buildPlaylistCardArtwork(playlist.id, latestTrack?.coverPath ?? null)}
                  />
                  <div className="space-y-1.5">
                    <h3 className="truncate text-[28px] font-bold tracking-[-0.06em] text-foreground">{playlist.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="rounded-md border border-border bg-background/65 px-2 py-1">Curator</span>
                      <span>{formatCount(playlist.trackCount, "tracks")}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Card className="rounded-[28px] border border-dashed border-border bg-card/60">
            <CardContent className="flex min-h-[230px] items-center justify-center">
              <span className="text-3xl font-black tracking-[0.22em] text-muted-foreground/45">Empty</span>
            </CardContent>
          </Card>
        )}
      </section>

      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          if (isCreating && !open) {
            return;
          }
          setIsCreateModalOpen(open);
          if (!open) {
            setCreateError(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[30px] border-border bg-popover/96 p-7 shadow-[0_18px_56px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:rounded-[30px]">
          <form className="space-y-6" onSubmit={handleCreatePlaylist}>
            <DialogHeader className="space-y-2 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">New Playlist</p>
              <DialogTitle className="text-3xl font-black tracking-[-0.06em] text-foreground">
                Create a new playlist
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                autoFocus
                value={createName}
                onChange={(event) => {
                  setCreateName(event.target.value);
                  if (createError) {
                    setCreateError(null);
                  }
                }}
                placeholder="Playlist name"
                className="h-13 rounded-2xl border-border bg-background/70 px-5 text-base"
              />
              {createError ? <p className="text-sm text-rose-300">{createError}</p> : null}
            </div>

            <DialogFooter className="flex justify-end gap-3 sm:space-x-0">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full px-5"
                onClick={() => {
                  if (isCreating) {
                    return;
                  }
                  setIsCreateModalOpen(false);
                  setCreateError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-full px-6" disabled={isCreating}>
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
