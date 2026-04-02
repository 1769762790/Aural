import type { UpdateTrackMetadataInput } from "@aural/contracts";
import type { Track } from "@aural/domain";

export type MetadataDraft = {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
};

export const createMetadataDraft = (track: Track): MetadataDraft => ({
  title: track.title,
  artist: track.artist,
  album: track.album,
  genre: track.genre ?? "",
  year: track.year ? String(track.year) : ""
});

export const normalizeMetadataInput = (
  trackId: Track["id"],
  draft: MetadataDraft
): { value: UpdateTrackMetadataInput | null; error: string | null } => {
  const title = draft.title.trim();
  const artist = draft.artist.trim();
  const album = draft.album.trim();
  const genre = draft.genre.trim();
  const yearText = draft.year.trim();

  if (!title || !artist || !album) {
    return {
      value: null,
      error: "Title, artist, and album are required."
    };
  }

  const parsedYear = yearText ? Number.parseInt(yearText, 10) : null;
  if (yearText && (parsedYear === null || !Number.isFinite(parsedYear) || parsedYear < 0)) {
    return {
      value: null,
      error: "Year must be a valid number."
    };
  }

  return {
    value: {
      trackId,
      title,
      artist,
      album,
      genre: genre || null,
      year: parsedYear
    },
    error: null
  };
};
