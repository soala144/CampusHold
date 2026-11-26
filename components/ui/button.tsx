import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "accent" | "ghost" | "inverse" | "outline-inverse";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  secondary: "border border-line-strong bg-canvas text-ink hover:border-ink/40 hover:bg-surface",
  accent: "bg-accent text-ink hover:bg-accent-strong",
  ghost: "text-muted hover:bg-surface hover:text-ink",
  inverse: "bg-white text-ink hover:bg-surface-strong",
  "outline-inverse": "border border-white/20 text-white hover:bg-white/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
  icon: "size-10 text-sm",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonStyles({ variant, size, className })} {...props} />;
}
