import clsx from "clsx";
import type { HTMLAttributes, PropsWithChildren } from "react";

export const Badge = ({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) => (
  <span className={clsx("aural-badge", className)} {...props}>
    {children}
  </span>
);

