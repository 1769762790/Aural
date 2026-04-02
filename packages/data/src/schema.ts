export const SCHEMA_VERSION = 4;

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  path_key TEXT NOT NULL UNIQUE,
  directory TEXT NOT NULL,
  directory_key TEXT NOT NULL,
  file_hash TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  album_artist TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  duration REAL NOT NULL DEFAULT 0,
  format TEXT NOT NULL,
  bitrate INTEGER,
  sample_rate INTEGER,
  cover_path TEXT,
  lyric_path TEXT,
  embedded_lyrics TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL,
  last_played_at TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  search_blob TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_tracks_file_hash ON tracks(file_hash);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_favorite ON tracks(is_favorite);

CREATE TABLE IF NOT EXISTS artist_summaries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  track_count INTEGER NOT NULL,
  album_count INTEGER NOT NULL,
  cover_path TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artist_summaries_name ON artist_summaries(normalized_name);

CREATE TABLE IF NOT EXISTS album_summaries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  year INTEGER,
  track_count INTEGER NOT NULL,
  cover_path TEXT,
  added_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_album_summaries_title ON album_summaries(title);
CREATE INDEX IF NOT EXISTS idx_album_summaries_artist ON album_summaries(artist);
CREATE INDEX IF NOT EXISTS idx_album_summaries_added_at ON album_summaries(added_at);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playable_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  provider TEXT,
  provider_item_id TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  album_artist TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  duration REAL NOT NULL DEFAULT 0,
  format TEXT NOT NULL DEFAULT 'STREAM',
  bitrate INTEGER,
  sample_rate INTEGER,
  cover_path TEXT,
  cover_url TEXT,
  lyric_path TEXT,
  path TEXT,
  directory TEXT,
  play_count INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL,
  last_played_at TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  file_hash TEXT,
  lyrics_availability TEXT NOT NULL DEFAULT 'none',
  downloaded_path TEXT,
  local_track_id TEXT,
  search_blob TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (local_track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playable_items_source ON playable_items(source, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_playable_items_provider ON playable_items(provider, provider_item_id);
CREATE INDEX IF NOT EXISTS idx_playable_items_local_track ON playable_items(local_track_id);

CREATE TABLE IF NOT EXISTS playlist_items (
  playlist_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  sort_index INTEGER NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (playlist_id, track_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id, sort_index);

CREATE TABLE IF NOT EXISTS playlist_entries (
  playlist_id TEXT NOT NULL,
  playable_item_id TEXT NOT NULL,
  sort_index INTEGER NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (playlist_id, playable_item_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (playable_item_id) REFERENCES playable_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playlist_entries_playlist ON playlist_entries(playlist_id, sort_index);

CREATE TABLE IF NOT EXISTS play_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id TEXT NOT NULL,
  played_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_play_history_track ON play_history(track_id, played_at DESC);

CREATE TABLE IF NOT EXISTS play_history_items (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  playable_item_id TEXT NOT NULL,
  played_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  FOREIGN KEY (playable_item_id) REFERENCES playable_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_play_history_items_item ON play_history_items(playable_item_id, played_at DESC);

CREATE TABLE IF NOT EXISTS favorite_items (
  playable_item_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  FOREIGN KEY (playable_item_id) REFERENCES playable_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS downloaded_assets (
  playable_item_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_item_id TEXT NOT NULL,
  local_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  downloaded_at TEXT,
  FOREIGN KEY (playable_item_id) REFERENCES playable_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_folders (
  folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  path_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_scanned_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_scan_folders_active ON scan_folders(is_active, path_key);
`;
