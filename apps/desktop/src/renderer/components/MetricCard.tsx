interface MetricCardProps {
  label: string;
  value: string;
  note: string;
}

export const MetricCard = ({ label, value, note }: MetricCardProps) => (
  <article className="aural-metric-card">
    <span>{label}</span>
    <strong>{value}</strong>
    <p>{note}</p>
  </article>
);

