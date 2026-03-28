interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  className
}: SectionHeadingProps) => (
  <div className={["aural-section-heading", className].filter(Boolean).join(" ")}>
    <h2>{title}</h2>
    {description ? <p>{description}</p> : null}
  </div>
);

