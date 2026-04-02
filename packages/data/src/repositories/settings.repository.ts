import { buildSearchBlob, nowIso } from "../helpers";
import type { AuralDatabase } from "../store";
import { mapSettingValue, parseSettingValue } from "./mappers";
import type { AlbumSummary, ArtistSummary, PlaylistSummary, SettingKey, SettingRecord, SettingValue } from "./types";

export const setSetting = (database: AuralDatabase, key: SettingKey, value: SettingValue): SettingRecord => {
  const updatedAt = nowIso();
  database.db
    .prepare(
      `
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `
    )
    .run(key, mapSettingValue(value), updatedAt);
  return { key, value, updatedAt };
};

export const getSetting = (database: AuralDatabase, key: SettingKey): SettingRecord | null => {
  const row = database.db.prepare("SELECT * FROM settings WHERE key = ?").get(key) as { key: SettingKey; value: string; updated_at: string } | undefined;
  return row ? { key: row.key, value: parseSettingValue(row.value), updatedAt: row.updated_at } : null;
};

export const getAllSettings = (database: AuralDatabase): SettingRecord[] =>
  (database.db.prepare("SELECT * FROM settings ORDER BY key ASC").all() as Array<{ key: SettingKey; value: string; updated_at: string }>).map((row) => ({
    key: row.key,
    value: parseSettingValue(row.value),
    updatedAt: row.updated_at
  }));

export const searchArtists = (listArtistsFn: () => ArtistSummary[], term: string): ArtistSummary[] => {
  const normalized = buildSearchBlob(term);
  return listArtistsFn().filter((artist) => buildSearchBlob(artist.name).includes(normalized));
};

export const searchAlbums = (listAlbumsFn: () => AlbumSummary[], term: string): AlbumSummary[] => {
  const normalized = buildSearchBlob(term);
  return listAlbumsFn().filter((album) => buildSearchBlob(album.title, album.artist).includes(normalized));
};
