import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArtistBrowserView } from "@renderer/components/artist/ArtistBrowserView";
import type { LibraryBrowserSortOption } from "@renderer/components/LibraryBrowser";
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
    <ArtistBrowserView
      eyebrow="Library View"
      title="Artists"
      description="Browse every artist discovered in your local music library."
      artists={artistList}
      sort={sort}
      sortOptions={artistSortOptions}
      emptyTitle="No artists available."
      emptyDescription="Import more local music to populate the artist shelf."
      onSortChange={setSort}
      onArtistSelect={(artist) => void navigate(`/artists/${artist.id}`)}
    />
  );
};
