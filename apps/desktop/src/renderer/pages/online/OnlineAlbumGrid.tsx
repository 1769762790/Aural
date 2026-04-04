import type { OnlineAlbumSummary } from "@aural/contracts";
import { OnlineAlbumCard } from "./OnlineAlbumCard";

interface OnlineAlbumGridProps {
  albums: OnlineAlbumSummary[];
  onOpenAlbum: (albumId: string) => void;
}

export const OnlineAlbumGrid = ({ albums, onOpenAlbum }: OnlineAlbumGridProps) => (
  <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:gap-x-9 xl:gap-y-14 xl:grid-cols-4 2xl:grid-cols-6">
    {albums.map((album) => (
      <OnlineAlbumCard key={album.id} album={album} onOpen={onOpenAlbum} />
    ))}
  </div>
);
