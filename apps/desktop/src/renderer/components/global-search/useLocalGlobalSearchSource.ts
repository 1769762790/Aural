import type { AlbumSummary, ArtistSummary, SearchTrackHit } from "@aural/domain";
import { bridge } from "@renderer/lib/bridge";

const LOCAL_TRACK_LIMIT = 6;
const LOCAL_ARTIST_LIMIT = 5;
const LOCAL_ALBUM_LIMIT = 5;

export interface LocalGlobalSearchResult {
  tracks: SearchTrackHit[];
  artists: ArtistSummary[];
  albums: AlbumSummary[];
}

const searchLocalGlobal = async (term: string): Promise<LocalGlobalSearchResult> => {
  const [tracks, artists, albums] = await Promise.all([
    bridge.search.searchTracks({ term, limit: LOCAL_TRACK_LIMIT }),
    bridge.search.searchArtists({ term, limit: LOCAL_ARTIST_LIMIT }),
    bridge.search.searchAlbums({ term, limit: LOCAL_ALBUM_LIMIT })
  ]);

  return {
    tracks,
    artists,
    albums
  };
};

export const useLocalGlobalSearchSource = () => searchLocalGlobal;
