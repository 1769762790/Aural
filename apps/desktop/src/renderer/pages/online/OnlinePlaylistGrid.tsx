import { useNavigate } from "react-router-dom";
import type { PlaylistSummary } from "@aural/domain";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount } from "@renderer/lib/formatters";

export const OnlinePlaylistGrid = ({
  playlists,
  emptyDescription,
  layoutMode = "grid"
}: {
  playlists: PlaylistSummary[];
  emptyDescription: string;
  layoutMode?: "grid" | "list";
}) => {
  const navigate = useNavigate();

  if (!playlists.length) {
    return (
      <Card className="border-border bg-card/78">
        <CardContent className="p-8 text-sm text-muted-foreground">{emptyDescription}</CardContent>
      </Card>
    );
  }

  if (layoutMode === "list") {
    return (
      <div className="space-y-3">
        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            type="button"
            className="flex w-full items-center justify-between gap-6 rounded-[24px] border border-border bg-card/72 px-5 py-5 text-left transition hover:bg-accent/35"
            onClick={() => {
              void navigate(`/collection/${playlist.id}`);
            }}
          >
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Playlist</p>
              <h3 className="text-2xl font-black tracking-[-0.06em] text-foreground">{playlist.name}</h3>
            </div>
            <p className="shrink-0 text-sm text-muted-foreground">{formatCount(playlist.trackCount, "tracks")}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {playlists.map((playlist) => (
        <button
          key={playlist.id}
          type="button"
          className="rounded-[24px] border border-border bg-card/72 p-5 text-left transition hover:bg-accent/35"
          onClick={() => {
            void navigate(`/collection/${playlist.id}`);
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Playlist</p>
          <h3 className="mt-3 text-2xl font-black tracking-[-0.06em] text-foreground">{playlist.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{formatCount(playlist.trackCount, "tracks")}</p>
        </button>
      ))}
    </div>
  );
};
