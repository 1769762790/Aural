import type { AlbumSummary } from "@aural/domain";

interface AlbumGridProps {
  albums: AlbumSummary[];
}

export const AlbumGrid = ({ albums }: AlbumGridProps) => (
  <div className="aural-album-grid">
    {albums.map((album) => (
      <article key={album.id} className="aural-album-tile">
        <div className="aural-album-tile__cover" />
        <div>
          <strong>{album.title}</strong>
          <p>{album.artist}</p>
          <small>{album.trackCount} tracks</small>
        </div>
      </article>
    ))}
  </div>
);

