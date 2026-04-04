import { buildSearchBlob, normalizePath, nowIso, pathKey } from "../helpers";
import type { AuralDatabase } from "../store";
import { ORDER_BY_FOLDER, direction } from "./mappers";
import type { FolderListQuery, FolderSummary, ScanFolderRecord } from "./types";

export const listFolders = (database: AuralDatabase, query: FolderListQuery = {}): FolderSummary[] => {
  const sortBy = query.sortBy ?? "path";
  const orderBy = ORDER_BY_FOLDER[sortBy];
  return (
    database.db.prepare(
      `
      SELECT
        sf.path AS path,
        sf.path_key AS path_key,
        COUNT(t.id) AS track_count,
        SUM(CASE WHEN t.status <> 'ready' THEN 1 ELSE 0 END) AS missing_count
      FROM scan_folders sf
      LEFT JOIN tracks t
        ON (t.path_key = sf.path_key OR t.path_key LIKE sf.path_key || '\\%')
      WHERE sf.is_active = 1
      GROUP BY sf.path, sf.path_key
      ORDER BY ${orderBy} ${direction(query.sortDirection)}
    `
    ).all() as Array<{ path: string; track_count: number; missing_count: number }>
  ).map((row) => ({
    path: row.path,
    trackCount: Number(row.track_count),
    missingCount: Number(row.missing_count ?? 0)
  }));
};

export const listScanFolders = (database: AuralDatabase): ScanFolderRecord[] =>
  (database.db.prepare("SELECT * FROM scan_folders ORDER BY created_at ASC").all() as unknown as ScanFolderRecord[]).map((row) => ({
    folder_id: row.folder_id,
    path: row.path,
    path_key: row.path_key,
    created_at: row.created_at,
    last_scanned_at: row.last_scanned_at,
    is_active: Boolean(row.is_active)
  }));

export const upsertScanFolders = (
  database: AuralDatabase,
  paths: string[],
  listScanFoldersFn: () => ScanFolderRecord[]
): ScanFolderRecord[] => {
  const createdAt = nowIso();
  const stmt = database.db.prepare(
    `
    INSERT INTO scan_folders (path, path_key, created_at, last_scanned_at, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(path_key) DO UPDATE SET
      path = excluded.path,
      is_active = 1
  `
  );
  for (const folderPath of paths) {
    const normalized = normalizePath(folderPath);
    stmt.run(normalized, pathKey(normalized), createdAt, createdAt);
  }
  return listScanFoldersFn();
};

export const markScanFoldersScanned = (database: AuralDatabase, paths: string[], scannedAt = nowIso()): void => {
  const stmt = database.db.prepare("UPDATE scan_folders SET last_scanned_at = ?, is_active = 1 WHERE path_key = ?");
  for (const folderPath of paths) {
    const normalized = normalizePath(folderPath);
    stmt.run(scannedAt, pathKey(normalized));
  }
};

export const deactivateMissingScanFolders = (database: AuralDatabase, activePaths: string[]): number => {
  const activeKeys = activePaths.map((folderPath) => pathKey(normalizePath(folderPath)));
  if (activeKeys.length === 0) {
    return Number(database.db.prepare("UPDATE scan_folders SET is_active = 0").run().changes);
  }
  const placeholders = activeKeys.map(() => "?").join(", ");
  return database.db.prepare(`UPDATE scan_folders SET is_active = 0 WHERE path_key NOT IN (${placeholders})`).run(...activeKeys).changes as number;
};

export const removeScanFolder = (
  database: AuralDatabase,
  path: string,
  refreshLibrarySummariesFn: () => void
): {
  folder: string;
  removedFromScanList: boolean;
  removedTracks: number;
  activeFolders: string[];
} => {
  const normalized = normalizePath(path);
  const normalizedKey = pathKey(normalized);
  const result = database.transaction(() => {
    const removedFromScanList = database.db.prepare("DELETE FROM scan_folders WHERE path_key = ?").run(normalizedKey).changes > 0;

    const removedTracks = database.db.prepare(
      `
      DELETE FROM tracks
      WHERE NOT EXISTS (
        SELECT 1
        FROM scan_folders sf
        WHERE sf.is_active = 1
          AND (tracks.path_key = sf.path_key OR tracks.path_key LIKE sf.path_key || '\\%')
      )
    `
    ).run().changes;

    const activeFolders = (
      database.db.prepare(
        `
        SELECT path
        FROM scan_folders
        WHERE is_active = 1
        ORDER BY created_at ASC
      `
      ).all() as Array<{ path: string }>
    ).map((row) => row.path);

    return {
      folder: normalized,
      removedFromScanList,
      removedTracks: Number(removedTracks),
      activeFolders
    };
  });

  refreshLibrarySummariesFn();
  return result;
};
