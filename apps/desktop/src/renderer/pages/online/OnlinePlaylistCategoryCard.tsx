import type { OnlinePlaylistRecommendation } from "@aural/contracts";
import { formatCount } from "@renderer/lib/formatters";
import { gradientForSeed } from "@renderer/lib/playlistArtwork";

interface OnlinePlaylistCategoryCardProps {
  playlist: OnlinePlaylistRecommendation;
  onOpen: (playlistId: string) => void;
}

export const OnlinePlaylistCategoryCard = ({
  playlist,
  onOpen
}: OnlinePlaylistCategoryCardProps) => {
  const artworkStyle = playlist.coverUrl
    ? { backgroundImage: `url("${playlist.coverUrl}")` }
    : { backgroundImage: gradientForSeed(`online-playlist:${playlist.id}`) };

  return (
    <button
      type="button"
      className="group flex w-full flex-col gap-3 text-left"
      onClick={() => onOpen(playlist.id)}
    >
      <div
        className="aspect-[1.08] w-full overflow-hidden rounded-[24px] bg-cover bg-center shadow-[0_22px_54px_rgba(15,23,42,0.18)] transition-transform duration-300 group-hover:scale-[1.015]"
        style={artworkStyle}
      >
        <div className="h-full w-full bg-[linear-gradient(180deg,rgba(8,11,18,0.02),rgba(8,11,18,0.18)_68%,rgba(8,11,18,0.42))]" />
      </div>

      <div className="space-y-1.5 px-1">
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight tracking-[-0.03em] text-foreground transition-colors duration-200 group-hover:text-primary">
          {playlist.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] tracking-[0.16em] text-foreground/72">Playlist</span>
          <span>{formatCount(playlist.trackCount, "tracks")}</span>
        </div>
      </div>
    </button>
  );
};
