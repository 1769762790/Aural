import { createArraySearchSource } from "../src/source";
import { DefaultSearchService } from "../src/service";

describe("search service", () => {
  it("searches tracks, artists, albums, and playlists with relevance ordering", async () => {
    const service = new DefaultSearchService(
      createArraySearchSource({
        tracks: [
          {
            id: "trk_1" as never,
            path: "c:/music/hello.flac",
            directory: "c:/music",
            title: "Hello",
            artist: "Adele",
            album: "25",
            albumArtist: "Adele",
            year: 2015,
            genre: null,
            duration: 360,
            format: "flac",
            bitrate: 1200,
            sampleRate: 44100,
            coverPath: null,
            lyricPath: null,
            isFavorite: false,
            playCount: 10,
            addedAt: "2026-01-01T00:00:00.000Z",
            lastPlayedAt: "2026-03-01T00:00:00.000Z",
            status: "ready",
            fileHash: null,
            searchText: "hello adele 25",
            pinyin: null,
            pinyinInitials: null
          },
          {
            id: "trk_2" as never,
            path: "c:/music/nihao.flac",
            directory: "c:/music",
            title: "你好",
            artist: "周杰伦",
            album: "范特西",
            albumArtist: "周杰伦",
            year: 2001,
            genre: null,
            duration: 280,
            format: "flac",
            bitrate: 1200,
            sampleRate: 44100,
            coverPath: null,
            lyricPath: null,
            isFavorite: true,
            playCount: 2,
            addedAt: "2026-02-01T00:00:00.000Z",
            lastPlayedAt: null,
            status: "ready",
            fileHash: null,
            searchText: "你好 周杰伦 范特西",
            pinyin: "ni hao",
            pinyinInitials: "nh"
          }
        ],
        artists: [
          { id: "art_1", name: "Adele", normalizedName: "adele", trackCount: 1, albumCount: 1, searchText: "adele" },
          { id: "art_2", name: "周杰伦", normalizedName: "zhou jie lun", trackCount: 1, albumCount: 1, searchText: "zhou jie lun", pinyin: "zhou jie lun", pinyinInitials: "zjl" }
        ],
        albums: [
          { id: "alb_1", title: "25", artist: "Adele", year: 2015, trackCount: 1, coverPath: null, searchText: "25 adele" },
          { id: "alb_2", title: "范特西", artist: "周杰伦", year: 2001, trackCount: 1, coverPath: null, searchText: "fan te xi", pinyin: "fan te xi", pinyinInitials: "ftx" }
        ],
        playlists: [
          { id: "pl_1" as never, name: "Morning", trackCount: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-03-01T00:00:00.000Z", searchText: "morning" },
          { id: "pl_2" as never, name: "通勤", trackCount: 2, createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-03-02T00:00:00.000Z", searchText: "tong qin", pinyin: "tong qin", pinyinInitials: "tq" }
        ]
      })
    );

    const tracks = await service.searchTracks({ term: "nihao" });
    const artists = await service.searchArtists({ term: "ade" });
    const albums = await service.searchAlbums({ term: "fan te" });
    const playlists = await service.searchPlaylists({ term: "tq" });
    const all = await service.searchAll({ term: "hello" });

    expect(tracks[0]?.reason).toBe("pinyin");
    expect(artists[0]?.name).toBe("Adele");
    expect(albums[0]?.title).toBe("范特西");
    expect(playlists[0]?.name).toBe("通勤");
    expect(all.tracks[0]?.title).toBe("Hello");
  });
});

