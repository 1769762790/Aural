import { createHash } from "node:crypto";

export type Brand<K, T> = K & { __brand: T };

export type TrackId = Brand<string, "TrackId">;
export type PlaylistId = Brand<string, "PlaylistId">;
export type QueueId = Brand<string, "QueueId">;
export type ScanRunId = Brand<string, "ScanRunId">;

const makeId = <T extends string>(prefix: string, value: string) =>
  `${prefix}_${createHash("sha1").update(value).digest("hex").slice(0, 12)}` as Brand<string, T>;

export const createTrackId = (value: string) => makeId<"TrackId">("trk", value);
export const createPlaylistId = (value: string) => makeId<"PlaylistId">("pl", value);
export const createQueueId = (value: string) => makeId<"QueueId">("que", value);
export const createScanRunId = (value: string) => makeId<"ScanRunId">("scan", value);

