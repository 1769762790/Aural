import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LibraryBrowser, type LibraryBrowserSortOption } from "@renderer/components/LibraryBrowser";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";

const artistSortOptions: LibraryBrowserSortOption[] = [
  { value: "name-asc", label: "A-Z" },
  { value: "tracks-desc", label: "Most Tracks" },
  { value: "albums-desc", label: "Most Albums" }
];

export const ArtistsPage = () => {
  const navigate = useNavigate();
  const [sort, setSort] = useState<string>("name-asc");
  const libraryRevision = useLibraryStore((state) => state.revision);
  const artists = useAsyncResource(
    () => {
      const [sortBy, sortDirection] = sort.split("-") as ["name" | "trackCount" | "albumCount", "asc" | "desc"];
      return bridge.library.listArtists({ sortBy, sortDirection });
    },
    [libraryRevision, sort],
    `library:artists:${libraryRevision}:${sort}`
  );

  const artistList = useMemo(() => artists.data ?? [], [artists.data]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Library View</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.06em] text-foreground">Artists</h1>
            <p className="mt-2 text-sm text-muted-foreground">Browse every artist discovered in your local music library.</p>
          </div>
          <span className="text-sm font-medium text-muted-foreground">{artistList.length} artists</span>
        </div>
      </div>

      <LibraryBrowser
        items={artistList.map((artist) => ({
          id: artist.id,
          title: artist.name,
          subtitle: `${artist.trackCount} tracks`,
          meta: `${artist.albumCount} albums`,
          coverPath: artist.coverPath,
          fallbackSeed: artist.id
        }))}
        sortLabel="A-Z"
        sortOptions={artistSortOptions}
        selectedSort={sort}
        onSortChange={setSort}
        emptyTitle="No artists available."
        emptyDescription="Import more local music to populate the artist shelf."
        onItemClick={(artist) => void navigate(`/artists/${artist.id}`)}
      />
    </div>
  );
};
