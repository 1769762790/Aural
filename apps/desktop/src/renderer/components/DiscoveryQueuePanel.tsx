interface DiscoveryQueueItem {
  title: string;
  note: string;
  detail: string;
  tone: "violet" | "indigo" | "cyan";
}

interface DiscoveryQueuePanelProps {
  items: DiscoveryQueueItem[];
}

export const DiscoveryQueuePanel = ({ items }: DiscoveryQueuePanelProps) => (
  <div className="aural-discovery-panel">
    {items.map((item) => (
      <article key={item.title} className="aural-discovery-panel__item">
        <span className={`aural-discovery-panel__dot is-${item.tone}`} />
        <div className="aural-discovery-panel__copy">
          <strong>{item.title}</strong>
          <p>{item.note}</p>
          <small>{item.detail}</small>
        </div>
      </article>
    ))}
  </div>
);
