import type { AlbumSummary, ArtistSummary, PlayableItem, SearchTrackHit } from "@aural/domain";
import { Disc3, LoaderCircle, Search, UserRound } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { formatDuration } from "@renderer/lib/formatters";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";
import { renderHighlightedText } from "./global-search.utils";

interface GlobalSearchResultsProps {
  loading: boolean;
  hasResults: boolean;
  normalizedQuery: string;
  artists: ArtistSummary[];
  albums: AlbumSummary[];
  localTracks: SearchTrackHit[];
  onlineTracks: PlayableItem[];
  onArtistSelect: (artist: ArtistSummary) => void;
  onAlbumSelect: (album: AlbumSummary) => void;
  onLocalTrackSelect: (track: SearchTrackHit) => Promise<void>;
  onOnlineTrackSelect: (track: PlayableItem) => Promise<void>;
}

export const GlobalSearchResults = ({
  loading,
  hasResults,
  normalizedQuery,
  artists,
  albums,
  localTracks,
  onlineTracks,
  onArtistSelect,
  onAlbumSelect,
  onLocalTrackSelect,
  onOnlineTrackSelect
}: GlobalSearchResultsProps) => (
  <Command shouldFilter={false} className="rounded-[28px] border-0 bg-transparent shadow-none">
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        <Search className="size-3.5" />
        <span>Smart Search</span>
      </div>
      {loading ? <LoaderCircle className="size-4 animate-spin text-primary" /> : null}
    </div>

    <CommandList className="max-h-[430px] p-2">
      {!loading && !hasResults ? <CommandEmpty>Try a song title, artist, or album name.</CommandEmpty> : null}

      {artists.length ? (
        <CommandGroup heading="Artists">
          {artists.map((artist) => (
            <CommandItem key={artist.id} value={`artist-${artist.id}`} onSelect={() => onArtistSelect(artist)} className="group">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/72 text-muted-foreground transition-colors group-data-[selected=true]:border-primary/40 group-data-[selected=true]:bg-accent group-data-[selected=true]:text-accent-foreground">
                <UserRound className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{renderHighlightedText(artist.name, normalizedQuery)}</p>
                <p className="truncate text-xs text-muted-foreground">{artist.trackCount} tracks - {artist.albumCount} albums</p>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}

      {artists.length && (albums.length || localTracks.length || onlineTracks.length) ? <CommandSeparator /> : null}

      {albums.length ? (
        <CommandGroup heading="Albums">
          {albums.map((album) => (
            <CommandItem key={album.id} value={`album-${album.id}`} onSelect={() => onAlbumSelect(album)} className="group">
              {album.coverPath ? (
                <span
                  className="size-11 shrink-0 rounded-2xl border border-border bg-cover bg-center shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
                  style={{ backgroundImage: `url("${resolvePlayableCoverUrl({ coverPath: album.coverPath, coverUrl: null })}")` }}
                />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/72 text-muted-foreground transition-colors group-data-[selected=true]:border-primary/40 group-data-[selected=true]:bg-accent group-data-[selected=true]:text-accent-foreground">
                  <Disc3 className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{renderHighlightedText(album.title, normalizedQuery)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {renderHighlightedText(`${album.artist} - ${album.trackCount} tracks${album.year ? ` - ${album.year}` : ""}`, normalizedQuery)}
                </p>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}

      {albums.length && (localTracks.length || onlineTracks.length) ? <CommandSeparator /> : null}

      {localTracks.length ? (
        <CommandGroup heading="Songs">
          {localTracks.map((track) => {
            const coverUrl = resolvePlayableCoverUrl({ coverPath: track.coverPath, coverUrl: null });
            const coverStyle = coverUrl
              ? { backgroundImage: `url("${coverUrl}")` }
              : {
                  backgroundImage:
                    "linear-gradient(135deg, color-mix(in srgb, var(--primary) 92%, white 8%), color-mix(in srgb, var(--primary) 26%, #31d2ff 74%))"
                };

            return (
              <CommandItem key={track.id} value={`track-${track.id}`} onSelect={() => void onLocalTrackSelect(track)} className="group">
                <span
                  className={cn(
                    "size-11 shrink-0 rounded-2xl border border-border bg-cover bg-center shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
                    !track.coverPath && "border-primary/18"
                  )}
                  style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : coverStyle}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{renderHighlightedText(track.title, normalizedQuery)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {renderHighlightedText(`${track.artist} - ${track.album}`, normalizedQuery)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {track.reason}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{formatDuration(track.duration)}</span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      ) : null}

      {localTracks.length && onlineTracks.length ? <CommandSeparator /> : null}

      {onlineTracks.length ? (
        <CommandGroup heading="Online Songs">
          {onlineTracks.map((track) => {
            const coverUrl = resolvePlayableCoverUrl(track);
            const coverStyle = coverUrl
              ? { backgroundImage: `url("${coverUrl}")` }
              : {
                  backgroundImage:
                    "linear-gradient(135deg, color-mix(in srgb, var(--primary) 84%, white 16%), color-mix(in srgb, var(--primary) 22%, #ff8b62 78%))"
                };

            return (
              <CommandItem
                key={track.id}
                value={`online-track-${track.id}`}
                onSelect={() => void onOnlineTrackSelect(track)}
                className="group"
              >
                <span
                  className={cn(
                    "size-11 shrink-0 rounded-2xl border border-border bg-cover bg-center shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
                    !coverUrl && "border-primary/18"
                  )}
                  style={coverStyle}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{renderHighlightedText(track.title, normalizedQuery)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {renderHighlightedText(`${track.artist} - ${track.album}`, normalizedQuery)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Online
                  </span>
                  <span className="text-[11px] text-muted-foreground">{formatDuration(track.duration)}</span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      ) : null}
    </CommandList>
  </Command>
);
