import type { CSSProperties } from "react";

interface SignaturePlaylistCardProps {
  title: string;
  subtitle: string;
  meta: string;
  covers: Array<string | null>;
}

export const SignaturePlaylistCard = ({ title, subtitle, meta, covers }: SignaturePlaylistCardProps) => (
  <article className="aural-signature-card">
    <div className="aural-signature-card__mosaic">
      {covers.slice(0, 4).map((cover, index) => {
        const tileStyle: CSSProperties | undefined = cover
          ? { backgroundImage: `url("${cover}")` }
          : undefined;

        return <span key={`${title}-${index}`} className="aural-signature-card__tile" style={tileStyle} />;
      })}
    </div>
    <div className="aural-signature-card__copy">
      <strong>{title}</strong>
      <p>{subtitle}</p>
      <small>{meta}</small>
    </div>
  </article>
);
