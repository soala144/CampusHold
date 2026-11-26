/**
 * Remembers where a visitor was going before they had to sign up or log in,
 * so they land back there afterwards. Only same-site paths are accepted.
 */
const KEY = "campushold:return-to";

const isSafe = (path: string) => path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");

export function setReturnTo(path: string) {
  if (isSafe(path)) sessionStorage.setItem(KEY, path);
}

export function takeReturnTo(fallback = "/dashboard"): string {
  const path = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return path && isSafe(path) ? path : fallback;
}
