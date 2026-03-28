import type { PropsWithChildren } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  children
}: PropsWithChildren<EmptyStateProps>) => (
  <div className="aural-empty-state">
    <span className="aural-empty-state__eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    <p>{description}</p>
    {children}
    {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
  </div>
);

