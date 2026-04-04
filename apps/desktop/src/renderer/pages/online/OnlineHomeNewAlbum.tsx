import { Link, useNavigate } from "react-router-dom";
import { bridge } from "@renderer/lib/bridge";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { OnlineAlbumCard } from "./OnlineAlbumCard";

const HOME_NEWEST_ALBUM_LIMIT = 10;

const OnlineHomeNewAlbum = () => {
  const navigate = useNavigate();
  const newestAlbums = useAsyncResource(
    () => bridge.online.getNewestAlbums(HOME_NEWEST_ALBUM_LIMIT),
    [],
    `online:home:newest-albums:${HOME_NEWEST_ALBUM_LIMIT}`
  );
  const albums = newestAlbums.data ?? [];

  return (
    <section className="w-full space-y-5">
      <div className="space-y-2 flex items-center justify-between">
        <h2 className="text-[32px] font-black leading-[0.9] tracking-[-0.08em] text-foreground">新专速递</h2>
        <Link to="/online/albums" className="text-sm text-muted-foreground hover:text-primary">
          查看更多
        </Link>
      </div>

      {newestAlbums.isLoading ? (
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: HOME_NEWEST_ALBUM_LIMIT }).map((_, index) => (
            <div key={`album-skeleton-${index}`} className="space-y-4">
              <div className="aspect-square w-full animate-pulse rounded-[24px] bg-muted/65" />
              <div className="space-y-2 px-1.5">
                <div className="h-5 w-4/5 animate-pulse rounded-full bg-muted/55" />
                <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-muted/45" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!newestAlbums.isLoading && newestAlbums.error ? (
        <div className="rounded-[24px] border border-border/70 bg-card/70 px-6 py-5 text-sm text-muted-foreground">
          最新专辑暂时加载失败，请稍后重试。
        </div>
      ) : null}

      {!newestAlbums.isLoading && !newestAlbums.error && albums.length === 0 ? (
        <div className="rounded-[24px] border border-border/70 bg-card/70 px-6 py-5 text-sm text-muted-foreground">
          暂时没有可展示的新专辑。
        </div>
      ) : null}

      {!newestAlbums.isLoading && !newestAlbums.error && albums.length > 0 ? (
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-5">
          {albums.map((album) => (
            <OnlineAlbumCard
              key={album.id}
              album={album}
              onOpen={(albumId) => {
                void navigate(`/online/albums/${albumId}`);
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default OnlineHomeNewAlbum;
