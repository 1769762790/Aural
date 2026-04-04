import { useNavigate } from "react-router-dom";
import { MediaDetailView } from "@renderer/components/MediaDetailView";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import { formatRuntimeCompact } from "@renderer/lib/formatters";
import { resolvePlayableCoverUrl } from "@renderer/lib/playable";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { useOnlineItemActions } from "./online/useOnlineItemActions";

const DAILY_RECOMMENDED_SONGS_CACHE_KEY = "online:daily-songs";

export const OnlineDailySongsPage = () => {
  const navigate = useNavigate();
  const playItems = usePlayerStore((state) => state.playItems);
  const songs = useAsyncResource(
    () => bridge.online.getDailyRecommendedSongs(),
    [],
    DAILY_RECOMMENDED_SONGS_CACHE_KEY
  );
  const playlists = useAsyncResource(() => bridge.collection.listPlaylists(), [], "online:daily-songs:playlists");
  const tracks = songs.data ?? [];
  const firstTrack = tracks[0] ?? null;
  const { renderItemActions } = useOnlineItemActions({
    playlists: playlists.data ?? [],
    refreshPlaylists: playlists.refresh
  });

  return (
    <MediaDetailView
      backLabel="Online Home"
      onBack={() => void navigate("/online")}
      title="每日推荐"
      description={
        songs.error
          ? "今日推荐歌曲暂时不可用，请确认账号已登录后重试。"
          : "根据你当天的听歌偏好生成的推荐歌曲集合，可直接整批播放或随机播放。"
      }
      stats={[
        "Daily Songs",
        `${tracks.length} Tracks`,
        formatRuntimeCompact(tracks.reduce((sum, track) => sum + track.duration, 0))
      ]}
      tracks={tracks}
      heroSeed="online:daily-songs"
      heroCoverPath={null}
      heroCoverUrl={resolvePlayableCoverUrl(firstTrack)}
      onPlayAll={() => {
        if (!tracks.length) {
          return;
        }
        void playItems(tracks, tracks[0]?.id, "playlist", "online-daily-songs");
      }}
      onShuffle={() => {
        if (!tracks.length) {
          return;
        }
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        void playItems(shuffled, shuffled[0]?.id, "playlist", "online-daily-songs:shuffle");
      }}
      onTrackPlay={(track) => void playItems(tracks, track.id, "playlist", "online-daily-songs")}
      renderTrackActions={renderItemActions}
    />
  );
};
