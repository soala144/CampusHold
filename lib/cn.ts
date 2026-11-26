import { extendTailwindMerge } from "tailwind-merge";

/** Teach tailwind-merge our custom design tokens so it groups them correctly. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "headline"],
      radius: ["card", "panel"],
      shadow: ["card", "float"],
      container: ["page"],
    },
  },
});

/**
 * Join class names. Later classes win when they conflict, so components can
 * accept overrides (e.g. `h-9` over a default `h-11`).
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
