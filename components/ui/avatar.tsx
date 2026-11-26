import type { User } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const sizes = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
};

/** Initials avatar with a stable, muted colour per user. */
export function Avatar({
  user,
  size = "md",
  className,
}: {
  user: Pick<User, "firstName" | "lastName" | "avatarHue">;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium tracking-tight",
        sizes[size],
        className,
      )}
      style={{
        backgroundColor: `oklch(0.93 0.04 ${user.avatarHue})`,
        color: `oklch(0.38 0.08 ${user.avatarHue})`,
      }}
    >
      {initials(user.firstName, user.lastName)}
    </span>
  );
}
