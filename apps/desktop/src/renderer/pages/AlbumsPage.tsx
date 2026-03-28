import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LibraryBrowser, type LibraryBrowserSortOption } from "@renderer/components/LibraryBrowser";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";

const albumSortOptions: LibraryBrowserSortOption[] = [
  { value: "addedAt-desc", label: "Recently Added" },
  { value: "title-asc", label: "A-Z" },
  { value: "artist-asc", label: "Artist" },
  { value: "year-desc", label: "Newest Year" }
];

export const AlbumsPage = () => {
  const navigate = useNavigate();
  const [sort, setSort] = useState<string>("addedAt-desc");
  const libraryRevision = useLibraryStore((state) => state.revision);
  const albums = useAsyncResource(
    () => {
      const [sortBy, sortDirection] = sort.split("-") as ["title" | "artist" | "year" | "addedAt", "asc" | "desc"];
      return bridge.library.listAlbums({ sortBy, sortDirection });
    },
    [libraryRevision, sort],
    `library:albums:${libraryRevision}:${sort}`
  );

  const albumList = useMemo(() => albums.data ?? [], [albums.data]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Library View</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.06em] text-foreground">Albums</h1>
            <p className="mt-2 text-sm text-muted-foreground">Scan the full album shelf from your imported collection.</p>
          </div>
          <span className="text-sm font-medium text-muted-foreground">{albumList.length} albums</span>
        </div>
      </div>

      <LibraryBrowser
        items={albumList.map((album) => ({
          id: album.id,
          title: album.title,
          subtitle: album.artist,
          meta: `${album.trackCount} tracks${album.year ? ` • ${album.year}` : ""}`,
          coverPath: album.coverPath,
          fallbackSeed: album.id
        }))}
        sortLabel="Recently Added"
        sortOptions={albumSortOptions}
        selectedSort={sort}
        onSortChange={setSort}
        emptyTitle="No albums available."
        emptyDescription="Once your library is scanned, album covers and metadata will appear here."
        onItemClick={(album) => void navigate(`/albums/${album.id}`)}
      />
    </div>
  );
};
