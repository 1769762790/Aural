import type { OnlineAlbumSummary } from "@aural/contracts";
import { gradientForSeed } from "@renderer/lib/playlistArtwork";

interface OnlineAlbumCardProps {
  album: OnlineAlbumSummary;
  onOpen: (albumId: string) => void;
}

export const OnlineAlbumCard = ({ album, onOpen }: OnlineAlbumCardProps) => {
  const artworkStyle = album.coverUrl
    ? { backgroundImage: `url("${album.coverUrl}")` }
    : { backgroundImage: gradientForSeed(`online-album:${album.id}`) };

  return (
    <div
      className="group flex w-full flex-col gap-4 text-left"
      onClick={() => onOpen(album.id)}
    >
      <div
        className="aspect-square w-full overflow-hidden rounded-[24px] border border-border/70 bg-cover bg-center shadow-[0_22px_52px_rgba(15,23,42,0.16)] transition-transform duration-300 group-hover:scale-[1.015]"
        style={artworkStyle}
      >
        <div className="h-full w-full bg-[linear-gradient(180deg,rgba(8,11,18,0.06),rgba(8,11,18,0.16)_58%,rgba(8,11,18,0.34))]" />
      </div>

      <div className="space-y-1.5 px-1.5">
        <h3 className="line-clamp-2 text-[1.05rem] font-semibold leading-tight tracking-[-0.03em] text-foreground transition-colors duration-200 group-hover:text-primary">
          {album.title}
        </h3>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{album.artist}</p>
          </div>
          {album.year ? <span className="text-xs text-muted-foreground">{album.year}</span> : null}
        </div>
      </div>
    </div>
  );
};
