import { afterEach, describe, expect, it } from "vitest";
import { AuralRepository } from "../src/repositories";
import { openAuralDatabase } from "../src/store";

const databases: Array<ReturnType<typeof openAuralDatabase>> = [];

afterEach(() => {
  while (databases.length) {
    databases.pop()?.close();
  }
});

describe("online artists repository", () => {
  it("aggregates online playable items into artist summaries and detail tracks", () => {
    const database = openAuralDatabase({ memory: true });
    databases.push(database);
    const repository = new AuralRepository(database);

    repository.upsertPlayableItem({
      id: "online-1",
      source: "online",
      provider: "unblockneteasemusic",
      providerItemId: "1",
      title: "Track One",
      artist: "Artist A",
      album: "Album Alpha",
      duration: 180,
      coverUrl: "https://example.com/a.jpg"
    });
    repository.upsertPlayableItem({
      id: "online-2",
      source: "online",
      provider: "unblockneteasemusic",
      providerItemId: "2",
      title: "Track Two",
      artist: "Artist A",
      album: "Album Beta",
      duration: 220,
      coverUrl: "https://example.com/b.jpg"
    });
    repository.upsertPlayableItem({
      id: "local-1",
      source: "local",
      title: "Local Track",
      artist: "Artist A",
      album: "Offline",
      duration: 210,
      path: "F:/music/local.mp3",
      directory: "F:/music"
    });

    const artists = repository.listOnlineArtists({ sortBy: "name", sortDirection: "asc" });
    expect(artists).toHaveLength(1);
    expect(artists[0]).toMatchObject({
      id: "artist a",
      name: "Artist A",
      trackCount: 2,
      albumCount: 2
    });

    const detail = repository.getOnlineArtistDetail("artist a");
    expect(detail?.tracks.map((track) => track.id)).toEqual(["online-2", "online-1"]);
    expect(detail?.totalDurationSeconds).toBe(400);
  });
});
