import {
  OnlinePlaylistFeatureCard,
  type OnlinePlaylistFeatureCardData
} from "./OnlinePlaylistFeatureCard";

interface OnlinePlaylistHeaderProps {
  featuredCards: OnlinePlaylistFeatureCardData[];
  onOpenCard: (cardId: string) => void;
  onPlayCard: (cardId: string) => void;
}

const FALLBACK_CARDS: OnlinePlaylistFeatureCardData[] = [
  {
    id: "__placeholder_recent__",
    seed: "online-playlists:placeholder:recent",
    badge: "Recent Favorites",
    title: "Midnight Resonance",
    subtitle: "Deep techno and atmospheric synthwaves layered for focused late-night sessions.",
    coverPath: null,
    disabled: true
  },
  {
    id: "__placeholder_editor__",
    seed: "online-playlists:placeholder:editor",
    badge: "Editor's Pick",
    title: "Minimalist Solitude",
    subtitle: "Neoclassical piano and cinematic textures arranged into a quiet streaming set.",
    coverPath: null,
    disabled: true
  }
];

export const OnlinePlaylistHeader = ({
  featuredCards,
  onOpenCard,
  onPlayCard
}: OnlinePlaylistHeaderProps) => {
  const cards = featuredCards.length
    ? [...featuredCards, ...FALLBACK_CARDS].slice(0, 2)
    : FALLBACK_CARDS;

  return (
    <section className="space-y-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-primary">Recent Favorites</p>

      <div className="grid gap-5 xl:grid-cols-2">
        {cards.map((card) => (
          <OnlinePlaylistFeatureCard
            key={card.id}
            card={card}
            onOpen={() => onOpenCard(card.id)}
            onPlay={() => onPlayCard(card.id)}
          />
        ))}
      </div>
    </section>
  );
};
