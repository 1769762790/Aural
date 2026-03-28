import clsx from "clsx";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "soft";
}

export const Button = ({
  children,
  className,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) => (
  <button
    className={clsx("aural-button", `aural-button--${variant}`, className)}
    {...props}
  >
    {children}
  </button>
);

